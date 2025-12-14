/**
 * Redis Key 常量定义
 * 统一管理所有 Redis Key，便于维护和避免 Key 冲突
 */

/**
 * 用户 Token Key
 * 格式: USER_TOKEN_KEY:${userId}
 * 值: JWT Token 字符串
 * 过期时间: 7天（与 JWT Refresh Token 过期时间一致）
 */
export const USER_TOKEN_KEY = 'user:token';

/**
 * 用户密码版本号 Key
 * 格式: USER_VERSION_KEY:${userId}
 * 值: 密码版本号（数字字符串）
 * 用途: 当用户密码或权限被修改时，更新版本号使旧 Token 失效
 */
export const USER_VERSION_KEY = 'user:version';

/**
 * 用户信息 Key
 * 格式: USER_INFO_KEY:${userId}
 * 值: 用户完整信息的 JSON 字符串（包含角色、权限、数据权限等）
 * 过期时间: 无（登录时更新）
 */
export const USER_INFO_KEY = 'user:info';

/**
 * 在线用户 Key
 * 格式: USER_ONLINE_KEY:${userId}
 * 值: 在线用户信息的 JSON 字符串
 * 过期时间: 7天（与 Token 同步）
 */
export const USER_ONLINE_KEY = 'user:online';

/**
 * 图片验证码 Key
 * 格式: CAPTCHA_IMG_KEY:${uuid}
 * 值: 验证码字符串
 * 过期时间: 5分钟
 */
export const CAPTCHA_IMG_KEY = 'captcha:img';

/**
 * 用户菜单 Key
 * 格式: USER_MENU_KEY:${userId}
 * 值: 用户菜单信息的 JSON 字符串（包含菜单）
 * 过期时间: 7天（与 Token 同步）
 */
export const USER_MENU_KEY = 'user:menus';

/**
 * 用户权限 Key
 * 格式: USER_PERMISSIONS_KEY:${userId}
 * 值: 用户权限信息的 JSON 字符串（包含菜单和按钮权限）
 * 过期时间: 7天（与 Token 同步）
 */
export const USER_PERMISSIONS_KEY = 'user:permissions';

/**
 * 菜单 Key
 * 格式: MENU_KEY:all
 * 值: 菜单信息的数组
 */
export const MENU_KEY = 'menu';

/**
 * 角色 Key
 * 格式: ROLE_KEY:all
 * 值: 角色信息的数组
 */
export const ROLE_KEY = 'role';

/**
 * 字典 Key
 * 格式: DICT_KEY:all
 * 值: 字典信息的数组
 */
export const DICT_KEY = 'dict';

/**
 * 生成完整的 Redis Key
 * @param prefix Key 前缀
 * @param suffix Key 后缀（通常是 userId 或其他标识符，支持 string 或 number）
 * @returns 完整的 Redis Key
 * @description 如果 suffix 是 number，会自动转换为字符串
 */
export function getRedisKey(prefix: string, suffix: string | number): string {
  return `${prefix}:${suffix}`;
}
