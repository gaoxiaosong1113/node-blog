var mongodb = require('./db'),
    markdown = require('markdown').markdown,
    marked = require('marked');

function Post(name, head, title, titleInfo, tags, post) {
    this.name = name;
    this.head = head;
    this.title = title;
    this.titleInfo = titleInfo;
    this.tags = tags;
    this.post = post;
}
function getBJDate() {
    //获得当前运行环境时间
    var d = new Date(), currentDate = new Date(), tmpHours = currentDate.getHours();
    //算得时区
    var time_zone = -d.getTimezoneOffset() / 60;
    //少于0的是西区 西区应该用时区绝对值加京八区 重新设置时间（西区时间比东区时间早 所以加时区间隔）
    if (time_zone < 0) {
        time_zone = Math.abs(time_zone) + 8;
        currentDate.setHours(tmpHours + time_zone);
    } else {
        //大于0的是东区  东区时间直接跟京八区相减
        time_zone -= 8;
        currentDate.setHours(tmpHours - time_zone);
    }
    return currentDate;
}

module.exports = Post;

Post.prototype.save = function (callback) {

    var date = new getBJDate();
    //存储各种时间格式，方便以后扩展
    var time = {
        date: date,
        year: date.getFullYear(),
        month: date.getFullYear() + "-" + (date.getMonth() + 1),
        day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
        date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    };
    //要存入数据库的文档
    var post = {
        id: String(parseInt(new Date().getTime())),
        name: this.name,
        head: this.head,
        time: time,
        title: this.title,
        titleInfo: this.titleInfo,
        tags: this.tags,
        post: this.post,
        comments: [],
        pv: 0
    };
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //将文档插入 posts 集合
            collection.insert(post, {
                safe: true
            }, function (err) {
                db.close();
                if (err) {
                    return callback(err);//失败！返回 err
                }
                callback(null);//返回 err 为 null
            });
        });
    });
};

//一次获取十篇文章
Post.getTen = function (name, page, callback) {
    //打开数据库
    console.log("连接数据库")
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        console.log("读取posts集合")
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            var query = {};
            if (name) {
                query.name = name;
            }
            //使用 count 返回特定查询的文档数 total
            collection.count(query, function (err, total) {
                console.log("读取posts集合成功")
                //根据 query 对象查询，并跳过前 (page-1)*10 个结果，返回之后的 10 个结果
                collection.find(query, {
                    skip: (page - 1) * 10,
                    limit: 10
                }).sort({
                    time: -1
                }).toArray(function (err, docs) {
                    db.close();
                    if (err) {
                        return callback(err);
                    }
                    console.log("处理posts集合")
                    var current = new getBJDate();
                    //解析 markdown 为 html
                    docs.forEach(function (doc) {
                        var currentSeconds = (current.getTime() - doc.time.date.getTime()) / 1000,
                            currentMinutes = currentSeconds / 60,
                            currentHours = currentMinutes / 60,
                            currentDay = currentHours / 24;
                        if (currentSeconds < 60) {
                            doc.time.minute = parseInt(currentSeconds) + "秒前";
                        } else if (currentMinutes < 60) {
                            doc.time.minute = parseInt(currentMinutes) + "分钟前";
                        } else if (currentHours < 24) {
                            doc.time.minute = parseInt(currentHours) + "小时前";
                        } else if (currentDay < 30) {
                            doc.time.minute = parseInt(currentDay) + "天前";
                        }
                        doc.post = marked(doc.post);
                        var reg = /<img[^>]+src\s*=\s*['\"]([^'\"]+)['\"][^>]*>/;
                        var img = doc.post.match(reg);
                        if (img) {
                            doc.postImg = img[1];
                        }
                    });
                    console.log("返回posts集合")
                    callback(null, docs, total);
                });
            });
        });
    });
};

Post.getOne = function (name, day, title, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //根据用户名、发表日期及文章名进行查询
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            }, function (err, doc) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                if (doc) {
                    //每访问 1 次，pv 值增加 1
                    collection.update({
                        "name": name,
                        "time.day": day,
                        "title": title
                    }, {
                        $inc: {"pv": 1}
                    }, function (err) {
                        db.close();
                        if (err) {
                            return callback(err);
                        }
                    });
                    //解析 markdown 为 html
                    doc.post = marked(doc.post);
                    doc.comments.forEach(function (comment) {
                        comment.content = marked(comment.content);
                    });
                    callback(null, doc);//返回查询的一篇文章
                }
            });
        });
    });
};
Post.gOne = function (id, callback) {
    console.log("打开数据库")
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        console.log("读取 posts 集合")
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            console.log("根据id进行查询")
            //根据用户名、发表日期及文章名进行查询
            collection.findOne({
                "id": id
            }, function (err, doc) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                if (doc) {
                    //每访问 1 次，pv 值增加 1
                    collection.update({
                        "id": id
                    }, {
                        $inc: {"pv": 1}
                    }, function (err) {
                        db.close();
                        if (err) {
                            return callback(err);
                        }
                    });

                    console.log("查询成功")
                    var current = new getBJDate();
                    var currentSeconds = (current.getTime() - doc.time.date.getTime()) / 1000,
                        currentMinutes = currentSeconds / 60,
                        currentHours = currentMinutes / 60,
                        currentDay = currentHours / 24;
                    if (currentSeconds < 60) {
                        doc.time.minute = parseInt(currentSeconds) + "秒前";
                    } else if (currentMinutes < 60) {
                        doc.time.minute = parseInt(currentMinutes) + "分钟前";
                    } else if (currentHours < 24) {
                        doc.time.minute = parseInt(currentHours) + "小时前";
                    } else if (currentDay < 30) {
                        doc.time.minute = parseInt(currentDay) + "天前";
                    }
                    doc.post = marked(doc.post);
                    var reg = /<img[^>]+src\s*=\s*['\"]([^'\"]+)['\"][^>]*>/;
                    var img = doc.post.match(reg);
                    if (img) {
                        doc.postImg = img[1];
                    }
                    //解析 markdown 为 html
                    doc.post = marked(doc.post);
                    doc.comments.forEach(function (comment) {
                        comment.content = marked(comment.content);
                    });
                    callback(null, doc);//返回查询的一篇文章
                }
            });
        });
    });
};

//返回原始发表的内容（markdown 格式）
Post.edit = function (id, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //根据用户名、发表日期及文章名进行查询
            collection.findOne({
                "id": id
            }, function (err, doc) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, doc);//返回查询的一篇文章（markdown 格式）
            });
        });
    });
};

//更新一篇文章及其相关信息
Post.update = function (id, tag, post, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //更新文章内容
            collection.update({
                "id": id
            }, {
                $set: {
                    post: post,
                    tags: tag
                }
            }, function (err) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

//删除一篇文章
Post.remove = function (id, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //根据用户名、日期和标题查找并删除一篇文章
            collection.remove({
                "id": id
            }, {
                w: 1
            }, function (err) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};
//删除一个评论
Post.removeComment = function (name, id, index, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
            if (err) {
                return callback(err);
            }
            //读取 posts 集合
            db.collection('posts', function (err, collection) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                collection.findOne({
                    "name": name,
                    "id": id
                }, function (err, doc) {
                    if (err) {
                        db.close();
                        return callback(err);
                    }
                    if (doc) {
                        //根据id查找并删除一篇文章
                        collection.update({
                            "id": id
                        }, {
                            $pop: {"comments": doc.comments[index]}
                        }, function (err) {
                            db.close();
                            if (err) {
                                return callback(err);
                            }
                        });
                        callback(null);
                    }
                });
            });
        }
    );
};

//返回所有文章存档信息
Post.getArchive = function (callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //返回只包含 name、time、title 属性的文档组成的存档数组
            collection.toArray(function (err, docs) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};
//返回所有标签
Post.getTags = function (callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //distinct 用来找出给定键的所有不同值
            collection.distinct("tags", function (err, docs) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};
//返回含有特定标签的所有文章
Post.getTag = function (tag, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //查询所有 tags 数组内包含 tag 的文档
            //并返回只含有 name、time、title 组成的数组
            collection.find({
                "tags": tag
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

//返回通过标题关键字查询的所有文章信息
Post.search = function (keyword, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            var pattern = new RegExp(keyword, "i");
            collection.find({
                "title": pattern
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                console.log(docs, 1212121212122)
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};