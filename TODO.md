## todoList

- 【拦截器】操作日志集成
  - 日志拦截器集成
- 【管道】数据分页功能集成
  - 分页dto定义`PaginationDto`（包含swagger定义），请求参数继承分页dto
  - 分页管道定义（数据转换，添加额外参数-分页参数转换为请求数据库需要的入参）
  - 返回数据dto定义`PaginatedDto`（包含swagger定义），返回数据继承该dto
  - 备注：
- 【管道】创建、更新、删除管道
  - 创建数据时，使用管道，自动追加参数`createTime`和`createUser`数据
  - 更新数据时，......，追加`updateTime`和`updateUser`数据
  - 删除数据时，......，追加`deleteTime`和`deleteUser`数据
  - 备注：
    - 需要根据上述字段重新建表，增加一部分参数
    - 定义集成的dto，例如有`BaseDataDto`，其他的dto（数据存储）需要继承该dto
