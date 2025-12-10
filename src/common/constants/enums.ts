/**
 * 全局枚举常量
 *
 * 统一管理项目中使用的枚举值，避免硬编码
 *
 * @module common/constants/enums
 */

/**
 * 启用/禁用状态枚举
 */
export enum EnableStatus {
  /** 启用 */
  ENABLED = '1',
  /** 禁用 */
  DISABLED = '2',
}

/**
 * 启用/禁用状态配置
 */
export const ENABLE_STATUS_CONFIG = {
  [EnableStatus.ENABLED]: {
    label: '启用',
    value: EnableStatus.ENABLED,
  },
  [EnableStatus.DISABLED]: {
    label: '禁用',
    value: EnableStatus.DISABLED,
  },
} as const;

