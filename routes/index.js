var crypto = require('crypto'),
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    PostWorks = require('../models/postWorks.js'),
    multer = require('multer'),
    Comment = require('../models/comment.js'),
    fs = require("fs");

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
var upload = multer({
    storage: storage
});

module.exports = function (app) {
    app.get('/', function (req, res) {
        //判断是否是第一页，并把请求的页数转换成 number 类型
        var page = parseInt(req.query.p) || 1;
        //查询并返回第 page 页的 10 篇文章
        console.log("开始查询数据库")
        Post.getTen(null, page, function (err, posts, total) {
            if (err) {
                posts = [];
            }
            console.log("查询完毕");
            res.render('index', {
                title: 'anhaogxs-blog',
                posts: posts,
                page: page,
                isFirstPage: (page - 1) == 0,
                isLastPage: ((page - 1) * 2 + posts.length) == total,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/text', function (req, res) {
        //判断是否是第一页，并把请求的页数转换成 number 类型
        res.header("Access-Control-Allow-Origin", "*");
        var page = parseInt(req.query.p) || 1;
        //查询并返回第 page 页的 10 篇文章
        Post.getTen(null, page, function (err, posts, total) {
            if (err) {
                posts = [];
            }
            res.json({ "result": posts });
        });
    });
    app.get('/reg', checkNotLogin);
    app.get('/reg', function (req, res) {
        res.render('reg', {
            title: '注册',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/reg', checkNotLogin);
    app.post('/reg', function (req, res) {
        var name = req.body.name,
            password = req.body.password,
            passwordRepeat = req.body.passwordRepeat;
        if (passwordRepeat != password) {
            req.flash('error', '两次输入的密码不一致!');
            return res.redirect('/reg');
        }
        var md5 = crypto.createHash('md5'),
            password = md5.update(req.body.password).digest('hex');
        var newUser = new User({
            name: name,
            password: password,
            email: req.body.email
        });
        User.get(newUser.name, function (err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            if (user) {
                req.flash('error', '用户已存在!');
                return res.redirect('/reg');
            }
            newUser.save(function (err, user) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/reg');
                }
                req.session.user = user;
                req.flash('success', '注册成功!');
                res.redirect('/');
            });
        });
    });

    app.get('/login', checkNotLogin);
    app.get('/login', function (req, res) {
        res.render('login', {
            title: '登录',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/login', checkNotLogin);
    app.post('/login', function (req, res) {
        var md5 = crypto.createHash('md5'),
            password = md5.update(req.body.password).digest('hex');
        User.get(req.body.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在!');
            }
            if (user.password != password) {
                req.flash('error', '密码错误!');
            }
            req.session.user = user;
            req.flash('success', '登陆成功!');
            res.redirect('/');
        });
    });

    app.get('/post', checkLogin);
    app.get('/post', function (req, res) {
        res.render('post', {
            title: '发表',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/post', checkLogin);
    app.post('/post', function (req, res) {
        var tag = [];
        if (req.body.tag instanceof Array) {
            for (var i = 0; i < req.body.tag.length; i++) {
                tag.push(req.body.tag[i])
            }
        } else {
            tag.push(req.body.tag)
        }
        var currentUser = req.session.user,
            post = new Post(currentUser.name, currentUser.head, req.body.title, req.body.titleInfo, tag, req.body.post);
        post.save(function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            req.flash('success', '发布成功!');
            res.redirect('/');//发表成功跳转到主页
        });
    });

    app.get('/PostWorks', checkLogin);
    app.get('/PostWorks', function (req, res) {
        res.render('postWorks', {
            title: '发布作品',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });

    app.post('/PostWorks', checkLogin);
    app.post('/PostWorks', function (req, res) {
        var currentUser = req.session.user,
            post = new PostWorks(currentUser.name, currentUser.head, req.body.title, req.body.titleInfo, req.body.tags, req.body.post);
        post.save(function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/works');
            }
            req.flash('success', '发布成功!');
            res.redirect('/works');//发表成功跳转到主页
        });
    });

    app.get('/logout', checkLogin);
    app.get('/logout', function (req, res) {
        req.session.user = null;
        req.flash('success', '登出成功!');
        res.redirect('/');
    });
    app.get('/upload', checkLogin);
    app.get('/upload', function (req, res) {
        res.render('upload', {
            title: '上传',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.post('/upload', checkLogin);
    app.post('/upload', upload.array('file'), function (req, res) {
        console.log(req.files[0]);  // 上传的文件信息
        if (undefined == req.files[0]) {
            res.json(['failed', { msg: "没有选择要上传的文件！" }]);
            return -1;
        }
        var des_file = "./public/images/" + req.files[0].originalname;
        fs.readFile(req.files[0].path, function (err, data) {
            fs.writeFile(des_file, data, function (err) {
                if (err) {
                    console.log(err);
                    res.json(['failed', { msg: err }]);
                } else {
                    var response = {
                        msg: 'File uploaded successfully',
                        filename: req.files[0].originalname,
                        fileUrl: '../images/' + req.files[0].originalname
                    };
                    console.log(response);
                    res.json(['success', response]);
                }
            });
        });
    });
    app.get('/links', function (req, res) {
        res.render('links', {
            title: '发现',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
    app.get('/search', function (req, res) {
        Post.search(req.query.keyword, function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('search', {
                title: "search:" + req.query.keyword,
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/u/:name', function (req, res) {
        var page = parseInt(req.query.p) || 1;
        //检查用户是否存在
        User.get(req.params.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在!');
                return res.redirect('/');
            }
            //查询并返回该用户第 page 页的 10 篇文章
            Post.getTen(user.name, page, function (err, posts, total) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                res.render('user', {
                    title: "个人中心",
                    posts: posts,
                    page: page,
                    isFirstPage: (page - 1) == 0,
                    isLastPage: ((page - 1) * 10 + posts.length) == total,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });
    app.get('/post/:id', function (req, res) {
        Post.gOne(req.params.id, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('article', {
                title: post.title,
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });

    app.get('/edit/:id', checkLogin);
    app.get('/edit/:id', function (req, res) {
        Post.edit(req.params.id, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            console.log(post)
            res.render('edit', {
                title: '编辑',
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.post('/edit/:id', checkLogin);
    app.post('/edit/:id', function (req, res) {
        var tag = [];
        if (req.body.tag instanceof Array) {
            for (var i = 0; i < req.body.tag.length; i++) {
                tag.push(req.body.tag[i])
            }
        } else {
            tag.push(req.body.tag)
        }
        Post.update(req.params.id, tag, req.body.post, function (err) {
            var url = encodeURI('/post/' + req.params.id);
            if (err) {
                req.flash('error', err);
                return res.redirect(url);//出错！返回文章页
            }
            req.flash('success', '修改成功!');
            res.redirect(url);//成功！返回文章页
        });
    });
    app.get('/editWork/:id', checkLogin);
    app.get('/editWork/:id', function (req, res) {
        PostWorks.edit(req.params.id, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            console.log(post)
            res.render('editWork', {
                title: '编辑',
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.post('/editWork/:id', checkLogin);
    app.post('/editWork/:id', function (req, res) {
        var tag = [];
        if (req.body.tag instanceof Array) {
            for (var i = 0; i < req.body.tag.length; i++) {
                tag.push(req.body.tag[i])
            }
        } else {
            tag.push(req.body.tag)
        }
        PostWorks.update(req.params.id, req.body, function (err) {
            var url = encodeURI('/works/' + req.params.id);
            if (err) {
                req.flash('error', err);
                return res.redirect(url);//出错！返回文章页
            }
            req.flash('success', '修改成功!');
            res.redirect(url);//成功！返回文章页
        });
    });
    app.get('/remove/:id', checkLogin);
    app.get('/remove/:id', function (req, res) {
        Post.remove(req.params.id, function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '删除成功!');
            res.redirect('/');
        });
    });
    app.get('/removeWork/:id', checkLogin);
    app.get('/removeWork/:id', function (req, res) {
        PostWorks.remove(req.params.id, function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '删除成功!');
            res.redirect('/works');
        });
    });
    app.get('/removeComment/:name/:id/:index', checkLogin);
    app.get('/removeComment/:name/:id/:index', function (req, res) {
        Post.removeComment(req.params.name, req.params.id, req.params.index, function (err) {
            var url = encodeURI('/post/' + req.params.id);
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '删除成功!');
            res.redirect(url);
        });
    });
    app.post('/u/:name/:day/:title', function (req, res) {
        var date = new Date(),
            time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
                date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
        var md5 = crypto.createHash('md5'),
            email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
            head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";
        var comment = {
            name: req.body.name,
            head: head,
            email: req.body.email,
            website: req.body.website,
            time: time,
            content: req.body.content
        };
        var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
        newComment.save(function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '留言成功!');
            res.redirect('back');
        });
    });
    app.get('/archive', checkLogin);
    app.get('/archive', function (req, res) {
        var page = parseInt(req.query.p) || 1;
        //检查用户是否存在
        User.get(req.params.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在!');
                return res.redirect('/');
            }
            //查询并返回该用户第 page 页的 10 篇文章
            Post.getTen(user.name, page, function (err, posts, total) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                res.render('user', {
                    title: posts.title,
                    posts: posts,
                    page: page,
                    isFirstPage: (page - 1) == 0,
                    isLastPage: ((page - 1) * 10 + posts.length) == total,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });
    app.get('/tags', function (req, res) {
        Post.getTags(function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tags', {
                title: '话题',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/works', function (req, res) {
        //判断是否是第一页，并把请求的页数转换成 number 类型
        var page = parseInt(req.query.p) || 1;
        //查询并返回第 page 页的 10 篇文章
        PostWorks.getTen(null, page, function (err, posts, total) {
            if (err) {
                posts = [];
            }
            res.render('works', {
                title: '作品',
                posts: posts,
                page: page,
                isFirstPage: (page - 1) == 0,
                isLastPage: ((page - 1) * 2 + posts.length) == total,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/works/:id', function (req, res) {
        PostWorks.gOne(req.params.id, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('workaArticle', {
                title: post.title,
                post: post,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/tags/:tag', function (req, res) {
        Post.getTag(req.params.tag, function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tag', {
                title: 'TAG:' + req.params.tag,
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
    app.get('/text', function (req, res) {
        res.header("Access-Control-Allow-Origin", "*");
        var page = parseInt(req.query.p) || 1;
        Post.getTen(null, page, function (err, posts, total) {
            if (err) {
                posts = [];
            }
            res.json({ "result": posts });
        });
    });
    // app.use(function (req, res) {
    //     res.render("404");
    // });
    function checkLogin(req, res, next) {
        if (!req.session.user) {
            req.flash('error', '未登录!');
            res.redirect('/login');
        }
        next();
    }
    function checkNotLogin(req, res, next) {
        if (req.session.user) {
            req.flash('error', '已登录!');
            res.redirect('back');
        }
        next();
    }
};
