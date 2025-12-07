/**
 * JWT Payload 接口定义
 */
export interface JwtPayload {
  /**
   * 用户ID
   */
  userId: number;

  /**
   * 用户名
   */
  userName: string;

  /**
   * 用户角色列表（角色编码）
   */
  roles: string[];

  /**
   * 密码版本号（用于使旧 Token 失效）
   */
  pv?: number;

  /**
   * Token 类型
   */
  type?: 'access' | 'refresh';

  /**
   * 签发时间（JWT 自动添加）
   */
  iat?: number;

  /**
   * 过期时间（JWT 自动添加）
   */
  exp?: number;
}
