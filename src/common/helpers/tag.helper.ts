/**
 * 标签辅助函数
 */
import { Tag } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { TagResponseDto } from '@/modules/tag/dto/tag-response.dto';
import { TagTreeResponseDto } from '@/modules/tag/dto/tag-tree-response.dto';

/**
 * 构建标签树形结构
 * @param tags 标签数据
 * @returns 标签树形结构
 */
export function buildTagTree(tags: Tag[]): TagTreeResponseDto[] {
  // 按 groupCode 分组
  const groupMap = new Map<string, TagTreeResponseDto>();

  for (const tag of tags) {
    const groupKey = tag.groupCode;

    if (!groupMap.has(groupKey)) {
      // 创建组节点
      const groupNode: TagTreeResponseDto = {
        groupCode: tag.groupCode,
        groupName: tag.groupName,
        groupStatus: tag.groupStatus,
        isGroup: true,
        children: [],
        tagCount: 0,
        createTime: tag.createTime.toISOString(),
      };
      groupMap.set(groupKey, groupNode);
    }

    const groupNode = groupMap.get(groupKey)!;
    groupNode.children.push(
      plainToInstance(TagResponseDto, tag, {
        excludeExtraneousValues: false,
      }),
    );
    groupNode.tagCount = (groupNode.tagCount || 0) + 1;

    // 更新最早创建时间
    const tagTime = tag.createTime.getTime();
    const nodeTime = new Date(groupNode.createTime!).getTime();
    if (tagTime < nodeTime) {
      groupNode.createTime = tag.createTime.toISOString();
    }
  }

  // 转换为数组并排序
  const treeList = Array.from(groupMap.values());
  treeList.sort((a, b) => {
    if (a.groupCode < b.groupCode) return -1;
    if (a.groupCode > b.groupCode) return 1;
    return 0;
  });

  return treeList;
}

