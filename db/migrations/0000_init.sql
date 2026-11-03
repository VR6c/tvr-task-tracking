CREATE TYPE "public"."environment_type" AS ENUM('Development', 'TestFlight', 'Production');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('quick_test', 'milestone_feature', 'production_bug', 'idea_propose', 'research_doc');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('Feedback', 'Done', 'Success');--> statement-breakpoint
CREATE TABLE "monthly_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"month_year" varchar(7) NOT NULL,
	"challenges_narrative" text,
	"success_stories_narrative" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_summaries_user_month_unique" UNIQUE("telegram_user_id","month_year")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" "task_category" NOT NULL,
	"environment" "environment_type" DEFAULT 'Development' NOT NULL,
	"status" "task_status" DEFAULT 'Feedback' NOT NULL,
	"build_version" varchar(100),
	"scheduled_date" date NOT NULL,
	"completed_at" timestamp with time zone,
	"is_over_deadline" boolean DEFAULT false NOT NULL,
	"issue_remark" text,
	"month_year" varchar(7) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_month_year_matches_date" CHECK ("tasks"."month_year" = to_char("tasks"."scheduled_date", 'YYYY-MM'))
);
--> statement-breakpoint
CREATE TABLE "weekly_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"good" text,
	"challenge" text,
	"improvement" text,
	"next_action" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_reviews_user_week_unique" UNIQUE("telegram_user_id","week_start_date")
);
--> statement-breakpoint
CREATE INDEX "tasks_user_date_idx" ON "tasks" USING btree ("telegram_user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "tasks_user_month_idx" ON "tasks" USING btree ("telegram_user_id","month_year");