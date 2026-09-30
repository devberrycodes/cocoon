import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const supabase = getSupabaseClient(token);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return {
    user,
    supabase,
    error: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);

    if (auth.error || !auth.user || !auth.supabase) {
      return auth.error;
    }

    const { user, supabase } = auth;

    // Prevent duplicate sample data
    const { data: existingSample, error: existingError } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_sample", true)
      .limit(1);

    if (existingError) {
      console.error("Sample data lookup error:", existingError);

      return NextResponse.json(
        { error: "Unable to check sample data." },
        { status: 500 }
      );
    }

    if (existingSample && existingSample.length > 0) {
      return NextResponse.json(
        { error: "Sample data is already loaded." },
        { status: 409 }
      );
    }

    const now = new Date();

    const tomorrow6pm = new Date(now);
    tomorrow6pm.setDate(tomorrow6pm.getDate() + 1);
    tomorrow6pm.setHours(18, 0, 0, 0);

    const tonight9pm = new Date(now);
    tonight9pm.setHours(21, 0, 0, 0);

    if (tonight9pm <= now) {
      tonight9pm.setDate(tonight9pm.getDate() + 1);
    }

    const tomorrow3pm = new Date(now);
    tomorrow3pm.setDate(tomorrow3pm.getDate() + 1);
    tomorrow3pm.setHours(15, 0, 0, 0);

    // Insert sample tasks
    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .insert([
        {
          user_id: user.id,
          title: "Plan portfolio update",
          description:
            "Refresh case studies and update project screenshots",
          completed: false,
          priority: "high",
          due_date: tomorrow6pm.toISOString(),
          is_sample: true,
        },
        {
          user_id: user.id,
          title: "Read for 30 minutes",
          description: "Continue current book",
          completed: false,
          priority: "low",
          due_date: tonight9pm.toISOString(),
          is_sample: true,
        },
        {
          user_id: user.id,
          title: "Finish Cocoon",
          description:
            "Test the production build and submit Stage 1",
          completed: false,
          priority: "high",
          due_date: tomorrow3pm.toISOString(),
          is_sample: true,
        },
      ])
      .select();

    if (taskError || !tasks) {
      console.error("Sample task insert error:", taskError);

      return NextResponse.json(
        { error: "Unable to create sample tasks." },
        { status: 500 }
      );
    }

    const portfolioTask = tasks.find(
      (task) => task.title === "Plan portfolio update"
    );

    const readingTask = tasks.find(
      (task) => task.title === "Read for 30 minutes"
    );

    const cocoonTask = tasks.find(
      (task) => task.title === "Finish Cocoon"
    );

    // Insert task notes + general clipboard notes
    const sampleNotes = [
      {
        user_id: user.id,
        task_id: portfolioTask?.id ?? null,
        content: "Export new project thumbnails",
        color: "pink",
        is_sample: true,
      },
      {
        user_id: user.id,
        task_id: portfolioTask?.id ?? null,
        content: "Rewrite the About section",
        color: "cream",
        is_sample: true,
      },
      {
        user_id: user.id,
        task_id: readingTask?.id ?? null,
        content: "Finish chapter four",
        color: "sage",
        is_sample: true,
      },
      {
        user_id: user.id,
        task_id: cocoonTask?.id ?? null,
        content: "Test mobile layout",
        color: "cream",
        is_sample: true,
      },
      {
        user_id: user.id,
        task_id: cocoonTask?.id ?? null,
        content: "Check Focus Mode",
        color: "pink",
        is_sample: true,
      },
      {
        user_id: user.id,
        task_id: cocoonTask?.id ?? null,
        content: "Verify sticky notes",
        color: "sage",
        is_sample: true,
      },

      // General clipboard notes
      {
        user_id: user.id,
        task_id: null,
        content: "Remember to drink water 🌱",
        color: "sage",
        is_sample: true,
      },
      {
        user_id: user.id,
        task_id: null,
        content: "Idea: make Cocoon mobile someday",
        color: "pink",
        is_sample: true,
      },
      {
        user_id: user.id,
        task_id: null,
        content: "Take things one task at a time.",
        color: "cream",
        is_sample: true,
      },
    ];

    const { error: notesError } = await supabase
      .from("notes")
      .insert(sampleNotes);

    if (notesError) {
      console.error("Sample notes insert error:", notesError);

      // Clean up sample tasks if note creation fails
      const { error: cleanupError } = await supabase
        .from("tasks")
        .delete()
        .eq("user_id", user.id)
        .eq("is_sample", true);

      if (cleanupError) {
        console.error(
          "Sample task cleanup after notes failure:",
          cleanupError
        );
      }

      return NextResponse.json(
        { error: "Unable to create sample notes." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Sample data loaded.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected sample data error:", error);

    return NextResponse.json(
      { error: "Unable to load sample data." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);

    if (auth.error || !auth.user || !auth.supabase) {
      return auth.error;
    }

    const { user, supabase } = auth;

    // Delete sample notes first
    const { error: notesError } = await supabase
      .from("notes")
      .delete()
      .eq("user_id", user.id)
      .eq("is_sample", true);

    if (notesError) {
      console.error("Sample notes delete error:", notesError);

      return NextResponse.json(
        { error: "Unable to clear sample notes." },
        { status: 500 }
      );
    }

    // Delete sample tasks only
    const { error: tasksError } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", user.id)
      .eq("is_sample", true);

    if (tasksError) {
      console.error("Sample tasks delete error:", tasksError);

      return NextResponse.json(
        { error: "Unable to clear sample tasks." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Sample data cleared.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected sample cleanup error:", error);

    return NextResponse.json(
      { error: "Unable to clear sample data." },
      { status: 500 }
    );
  }
}