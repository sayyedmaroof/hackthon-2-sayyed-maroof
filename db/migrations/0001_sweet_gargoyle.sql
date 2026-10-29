CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"user_id" text,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"lines" jsonb NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cart_idempotency_key" text NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stripe_webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_reference_unique" ON "orders" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_stripe_session_unique" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_cart_attempt_unique" ON "orders" USING btree ("cart_idempotency_key");--> statement-breakpoint
CREATE INDEX "orders_user_created_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_stripe_session_idx" ON "orders" USING btree ("stripe_session_id");