/**
 * 字典辅助函数
 */
import { Dict } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { DictResponseDto } from '@/modules/dict/dto/dict-response.dto';
import { DictTreeResponseDto } from '@/modules/dict/dto/dict-tree-response.dto';

/**
 * 构建字典树形结构
 * @param dicts 字典数据
 * @returns 字典树形结构
 */
export function buildDictTree(dicts: Dict[]): DictTreeResponseDto[] {
  // 按 typeCode 分组
  const typeMap = new Map<string, DictTreeResponseDto>();

  for (const dict of dicts) {
    const typeKey = dict.typeCode;

    if (!typeMap.has(typeKey)) {
      // 创建类型节点
      const typeNode: DictTreeResponseDto = {
        typeCode: dict.typeCode,
        typeName: dict.typeName,
        typeStatus: dict.typeStatus,
        isType: true,
        children: [],
        dataCount: 0,
        createTime: dict.createTime.toISOString(),
      };
      typeMap.set(typeKey, typeNode);
    }

    const typeNode = typeMap.get(typeKey)!;
    typeNode.children.push(
      plainToInstance(DictResponseDto, dict, {
        excludeExtraneousValues: false,
      }),
    );
    typeNode.dataCount = (typeNode.dataCount || 0) + 1;

    // 更新最早创建时间
    const dictTime = dict.createTime.getTime();
    const nodeTime = new Date(typeNode.createTime!).getTime();
    if (dictTime < nodeTime) {
      typeNode.createTime = dict.createTime.toISOString();
    }
  }

  // 转换为数组并排序
  const treeList = Array.from(typeMap.values());
  treeList.sort((a, b) => {
    if (a.typeCode < b.typeCode) return -1;
    if (a.typeCode > b.typeCode) return 1;
    return 0;
  });

  return treeList;
}
