# 🔄 **DATABASE RESET INSTRUCTIONS**
## Create Empty Tables in Local Supabase

---

## 🎯 **OBJECTIVE**
Create completely empty tables in your local Supabase environment for fresh development.

---

## 📋 **STEP-BY-STEP INSTRUCTIONS**

### **Step 1: Open Supabase SQL Editor**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Select your **local environment** database

### **Step 2: Run Reset Script**
1. Copy the entire contents of `src/lib/RESET_DATABASE.sql`
2. Paste it into the SQL editor
3. Click **Run** to execute the script

### **Step 3: Verify Results**
After running, you should see:
- ✅ **"Success"** message for each table creation
- ✅ **"0 rows"** returned for all tables (empty)
- ✅ **All tables created** with proper structure

---

## 🔍 **WHAT THE RESET SCRIPT DOES**

### **🗑️ Complete Cleanup:**
- **DROPS all existing tables** - Clean slate
- **Removes all data** - Fresh start
- **Preserves no conflicts** - Clean recreation

### **🏗️ Fresh Table Creation:**
- **Creates all required tables** with proper structure
- **Adds all indexes** for performance
- **Implements RLS policies** for security
- **Sets up triggers** for automation

### **🌱 Minimal Seed Data:**
- **Departments**: 7 default departments (HOD, Library, IT, etc.)
- **Country Codes**: India (+91), United States (+1)
- **Email Config**: Domain settings, system email
- **Reapplication Rules**: Default limits (5 global, 3 per dept)

---

## 📊 **EXPECTED RESULTS**

### **Empty Tables Created:**
- `config_schools` - 0 rows
- `config_courses` - 0 rows  
- `config_branches` - 0 rows
- `departments` - 7 rows (seed data)
- `profiles` - 0 rows
- `no_dues_forms` - 0 rows
- `no_dues_status` - 0 rows
- `no_dues_reapplication_history` - 0 rows
- `config_reapplication_rules` - 3 rows (seed data)
- `certificate_verifications` - 0 rows
- `email_logs` - 0 rows
- `support_tickets` - 0 rows

### **Ready for Development:**
- ✅ **All tables empty** (except minimal seed data)
- ✅ **Proper relationships** established
- ✅ **Security policies** in place
- ✅ **Performance indexes** created
- ✅ **Automation triggers** active

---

## 🚀 **AFTER RESET**

### **Your Local Database Will Be:**
1. **Completely empty** of user data
2. **Ready for fresh development**
3. **Properly structured** with all relationships
4. **Secure** with RLS policies
5. **Optimized** with performance indexes

### **Next Steps:**
1. **Start the application** - It will connect to empty database
2. **Create test users** - Register first admin/student accounts
3. **Test workflows** - Submit forms, approve/reject, etc.
4. **Populate as needed** - Add real data through application

---

## ⚠️ **IMPORTANT NOTES**

### **⚠️ WARNING:**
- **This will DELETE ALL EXISTING DATA** in your local database
- **Use only for local development** - NOT for production
- **Backup first** if you have important data to preserve

### **✅ BENEFITS:**
- **Clean slate** - No conflicts from old data
- **Fresh start** - Perfect for testing new features
- **Known state** - Predictable behavior
- **Proper structure** - All tables correctly created

---

## 🎯 **READY TO RESET?**

**Run the `RESET_DATABASE.sql` script in your Supabase SQL editor to create empty tables!**

Your local database will be completely reset and ready for fresh development. 🚀
