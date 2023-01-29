<!--
 * @Author: gaoxiaosong
 * @Date: 2022-02-15 15:57:44
 * @LastEditors: gaoxiaosong
 * @LastEditTime: 2022-02-15 16:10:13
 * @Description: 
-->

```
# 进入目录
cd /usr/local

# 下载
# mac
sudo curl -O https://fastdl.mongodb.org/osx/mongodb-macos-x86_64-5.0.6.tgz
# linux
sudo curl -O https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-rhel80-5.0.6.tgz

# 设置环境变量
export PATH=/usr/local/mongodb/bin:$PATH 

# 创建数据目录
/usr/local/mongodb
sudo mkdir mongData
cd mongData
mkdir db

# 设置目录权限
sudo chown -R /usr/local/mongodb/mongData

# 启动脚本
/usr/local/mongodb/bin/mongod --dbpath /usr/local/mongodb/mongData/db/ --logpath /usr/local/mongodb/mongData/db/mongo.log
```

