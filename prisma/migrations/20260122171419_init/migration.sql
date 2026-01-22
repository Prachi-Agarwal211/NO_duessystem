-- CreateTable
CREATE TABLE "config_schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_courses" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_branches" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT,
    "is_school_specific" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_emails" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_emails_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "config_validation_rules" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_validation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_country_codes" (
    "id" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "dial_code" TEXT NOT NULL,
    "flag_emoji" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_country_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_reapplication_rules" (
    "id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_reapplication_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "registration_no" TEXT,
    "role" TEXT NOT NULL DEFAULT 'student',
    "department_name" TEXT,
    "assigned_department_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "school_id" TEXT,
    "school_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "course_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "branch_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_dues_forms" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "registration_no" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "parent_name" TEXT,
    "admission_year" TEXT,
    "passing_year" TEXT,
    "school_id" TEXT,
    "school" TEXT,
    "course_id" TEXT,
    "course" TEXT,
    "branch_id" TEXT,
    "branch" TEXT,
    "country_code" TEXT,
    "contact_no" TEXT,
    "personal_email" TEXT,
    "college_email" TEXT,
    "email" TEXT,
    "alumni_profile_link" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reapplication_of" TEXT,
    "reapplication_count" INTEGER NOT NULL DEFAULT 0,
    "last_reapplied_at" TIMESTAMP(3),
    "student_reply_message" TEXT,
    "is_reapplication" BOOLEAN NOT NULL DEFAULT false,
    "max_reapplications_override" INTEGER,
    "rejection_context" JSONB,
    "rejection_reason" TEXT,
    "final_certificate_generated" BOOLEAN NOT NULL DEFAULT false,
    "certificate_url" TEXT,
    "blockchain_hash" TEXT,
    "blockchain_tx" TEXT,
    "blockchain_block" INTEGER,
    "blockchain_timestamp" TIMESTAMP(3),
    "blockchain_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "no_dues_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_dues_status" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "action_by" TEXT,
    "action_at" TIMESTAMP(3),
    "remarks" TEXT,
    "student_reply_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "no_dues_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_dues_reapplication_history" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "reapplication_number" INTEGER NOT NULL,
    "reapplication_reason" TEXT NOT NULL,
    "student_reply_message" TEXT,
    "department_responses" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "no_dues_reapplication_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "no_dues_messages" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "no_dues_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_data" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "registration_no" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "parent_name" TEXT,
    "school" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "contact_no" TEXT,
    "personal_email" TEXT,
    "college_email" TEXT,
    "admission_year" TEXT,
    "passing_year" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "student_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_verifications" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "verification_result" TEXT NOT NULL,
    "tampered_fields" JSONB,
    "verified_by_ip" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "form_id" TEXT,
    "registration_no" TEXT,
    "student_name" TEXT,
    "user_email" TEXT NOT NULL,
    "requester_type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assigned_to" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "email_type" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "department_emails" BOOLEAN NOT NULL DEFAULT true,
    "certificate_email" BOOLEAN NOT NULL DEFAULT true,
    "status_emails" BOOLEAN NOT NULL DEFAULT true,
    "reminder_emails" BOOLEAN NOT NULL DEFAULT true,
    "support_emails" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "certificate_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "user_id" TEXT,
    "student_name" TEXT NOT NULL,
    "registration_no" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "completion_date" TIMESTAMP(3) NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "file_path" TEXT,
    "file_size" INTEGER,
    "file_hash" TEXT,
    "blockchain_tx_id" TEXT,
    "verification_url" TEXT,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "last_download_at" TIMESTAMP(3),
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "text_content" TEXT,
    "variables" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "department" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfileCourses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ProfileBranches" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "config_schools_name_key" ON "config_schools"("name");

-- CreateIndex
CREATE UNIQUE INDEX "config_courses_school_id_name_key" ON "config_courses"("school_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "config_branches_course_id_name_key" ON "config_branches"("course_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "config_country_codes_country_code_key" ON "config_country_codes"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_data_form_id_key" ON "student_data"("form_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_id_key" ON "support_tickets"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_user_id_key" ON "notification_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificate_id_key" ON "certificates"("certificate_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_template_name_key" ON "email_templates"("template_name");

-- CreateIndex
CREATE UNIQUE INDEX "_ProfileCourses_AB_unique" ON "_ProfileCourses"("A", "B");

-- CreateIndex
CREATE INDEX "_ProfileCourses_B_index" ON "_ProfileCourses"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProfileBranches_AB_unique" ON "_ProfileBranches"("A", "B");

-- CreateIndex
CREATE INDEX "_ProfileBranches_B_index" ON "_ProfileBranches"("B");

-- AddForeignKey
ALTER TABLE "config_courses" ADD CONSTRAINT "config_courses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "config_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_branches" ADD CONSTRAINT "config_branches_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "config_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "config_schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_department_name_fkey" FOREIGN KEY ("department_name") REFERENCES "departments"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_dues_forms" ADD CONSTRAINT "no_dues_forms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_dues_status" ADD CONSTRAINT "no_dues_status_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "no_dues_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_dues_status" ADD CONSTRAINT "no_dues_status_department_name_fkey" FOREIGN KEY ("department_name") REFERENCES "departments"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_dues_reapplication_history" ADD CONSTRAINT "no_dues_reapplication_history_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "no_dues_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_dues_messages" ADD CONSTRAINT "no_dues_messages_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "no_dues_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_dues_messages" ADD CONSTRAINT "no_dues_messages_department_name_fkey" FOREIGN KEY ("department_name") REFERENCES "departments"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "no_dues_messages" ADD CONSTRAINT "no_dues_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_data" ADD CONSTRAINT "student_data_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "no_dues_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_verifications" ADD CONSTRAINT "certificate_verifications_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "no_dues_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_email_fkey" FOREIGN KEY ("user_email") REFERENCES "profiles"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "no_dues_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfileCourses" ADD CONSTRAINT "_ProfileCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "config_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfileCourses" ADD CONSTRAINT "_ProfileCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfileBranches" ADD CONSTRAINT "_ProfileBranches_A_fkey" FOREIGN KEY ("A") REFERENCES "config_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfileBranches" ADD CONSTRAINT "_ProfileBranches_B_fkey" FOREIGN KEY ("B") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
