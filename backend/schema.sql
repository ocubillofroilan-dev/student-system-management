create extension if not exists "uuid-ossp";

create table if not exists users (
    id uuid primary key default uuid_generate_v4(),
    role text not null check (role in ('student', 'teacher')),
    first_name text not null,
    last_name text not null,
    middle_name text default '',
    id_number text unique not null,       
    password_hash text not null,
    year_level text,                      
    department text,
    course text,                           
    created_at timestamptz default now()
);

create table if not exists announcements (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    body text not null,
    posted_by uuid references users(id) on delete set null,
    created_at timestamptz default now()
);

create table if not exists courses (
    id uuid primary key default uuid_generate_v4(),
    code text not null,
    title text not null,
    description text default '',
    department text default '',
    units integer default 3
);

create table if not exists schedules (
    id uuid primary key default uuid_generate_v4(),
    course_id uuid references courses(id) on delete cascade,
    day_of_week text not null,   
    start_time text not null,    
    end_time text not null,      
    room text default ''
);

create table if not exists attendance (
    id uuid primary key default uuid_generate_v4(),
    student_id uuid references users(id) on delete cascade,
    course_id uuid references courses(id) on delete cascade,
    date date not null,
    status text not null check (status in ('present', 'absent', 'late')),
    recorded_by uuid references users(id) on delete set null,
    created_at timestamptz default now()
);

create table if not exists grades (
    id uuid primary key default uuid_generate_v4(),
    student_id uuid references users(id) on delete cascade,
    course_id uuid references courses(id) on delete cascade,
    grading_period text not null,  
    grade text not null,
    recorded_by uuid references users(id) on delete set null,
    created_at timestamptz default now()
);

create index if not exists idx_attendance_student on attendance(student_id);
create index if not exists idx_grades_student on grades(student_id);
create index if not exists idx_schedules_course on schedules(course_id);
