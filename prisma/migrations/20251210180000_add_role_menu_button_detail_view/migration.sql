-- CreateView
CREATE VIEW `v_role_menu_button_detail` AS
SELECT 
    rmb.id,
    rmb.role_id,
    rmb.menu_id,
    rmb.button_id,
    rmb.create_time,
    -- 角色信息
    r.role_name,
    r.role_code,
    r.enabled AS role_enabled,
    -- 菜单信息
    m.name AS menu_name,
    m.path AS menu_path,
    m.title AS menu_title,
    m.icon AS menu_icon,
    m.component AS menu_component,
    m.status AS menu_status,
    -- 按钮信息
    mb.title AS button_title,
    mb.auth_mark AS button_auth_mark,
    mb.sort_order AS button_sort_order
FROM 
    role_menu_buttons rmb
    INNER JOIN roles r ON rmb.role_id = r.role_id
    INNER JOIN menus m ON rmb.menu_id = m.id
    INNER JOIN menu_buttons mb ON rmb.button_id = mb.id
ORDER BY 
    rmb.role_id, 
    rmb.menu_id, 
    mb.sort_order;

