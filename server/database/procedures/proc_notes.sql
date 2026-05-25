-- Project Notes Module Procedures
-- Individual procedures follow

-- 1. Get project notes details
CREATE PROCEDURE proc_get_project_notes()
BEGIN
    SELECT english_details, hinglish_details FROM project_notes WHERE id = 1;
END;

/* NEXT_PROCEDURE */

-- 2. Get pattern password for verification
CREATE PROCEDURE proc_get_pattern_password()
BEGIN
    SELECT pattern_password FROM project_notes WHERE id = 1;
END;
