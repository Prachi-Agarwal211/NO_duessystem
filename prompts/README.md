# JECRC No Dues Application - Development Prompts

This folder contains detailed prompts for implementing the complete JECRC No Dues Web Application according to the refactoring plan. Each file corresponds to a specific component or feature of the application.

## Implementation Order

Follow this order to implement the application systematically:

1. **Database Schema** (`01_database_schema.sql`)
   - Execute this SQL in your Supabase database first

2. **Configuration** (`02_supabase_client_config.md`, `03_database_types.md`)
   - Set up Supabase client and database types

3. **Authentication APIs** (`04_auth_signup_api.md` - `07_auth_logout_api.md`)
   - Implement all authentication API routes

4. **Middleware** (`08_middleware.md`)
   - Set up authentication and role-based routing

5. **Layout & Home** (`09_root_layout.md`, `10_home_page.md`)
   - Create root layout and home redirect

6. **Authentication Pages** (`11_login_page.md`, `12_signup_page.md`)
   - Implement login and signup UI

7. **UI Components** (`13_glass_card_component.md` - `17_data_table_component.md`)
   - Create all reusable UI components

8. **Student Flow** (`18_student_form_page.md`, `19_status_tracker_component.md`)
   - Implement student form and status tracking

9. **Staff Flow** (`20_staff_dashboard.md`, `21_student_detail_view.md`)
   - Create staff dashboard and student detail view

10. **Additional Components** (`22_search_bar_component.md`)
    - Implement remaining UI components

11. **Legacy Support** (`23_department_action_page.md`)
    - Create department action page for email links

## Database Setup

1. Execute the SQL in `01_database_schema.sql` in your Supabase SQL editor
2. Update your `.env.local` file with Supabase URL and ANON key
3. Update the database types file after schema changes

## Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Features Implemented

- Complete role-based access control (Student, Department Staff, Registrar)
- Real-time status tracking
- Form submission with alumni verification
- Staff dashboard with department-specific queues
- Registrar dashboard with all applications
- Certificate generation (backend logic to be implemented)
- Email notifications (backend logic to be implemented)
- Responsive design with glass morphism UI
- Secure authentication and authorization
- Audit logging (schema included, implementation needed)

## Next Steps

After implementing all prompts:

1. Test authentication and authorization flow
2. Verify database relationships and RLS policies
3. Test form submission and status tracking
4. Ensure staff and registrar dashboards work properly
5. Test mobile responsiveness
6. Implement certificate generation backend
7. Implement email notification service
8. Add proper error handling and logging
9. Perform security audit
10. Deploy to Vercel