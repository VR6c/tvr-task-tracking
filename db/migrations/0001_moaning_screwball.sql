CREATE TABLE "day_offs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" bigint NOT NULL,
	"date" date NOT NULL,
	"kind" varchar(16) NOT NULL,
	"detail" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "day_offs_user_date_unique" UNIQUE("telegram_user_id","date")
);
