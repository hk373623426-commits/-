@echo off
echo ==========================================
echo 景田天然矿泉水网站启动脚本
echo ==========================================

REM 检查Node.js版本
node --version
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 检查npm版本
npm --version
if errorlevel 1 (
    echo 错误: 未找到npm
    pause
    exit /b 1
)

REM 安装依赖
echo 正在安装依赖...
call npm install

REM 复制环境变量文件
if not exist .env (
    echo 正在创建环境变量文件...
    copy .env.example .env
    echo 请编辑 .env 文件中的配置
)

REM 初始化数据
echo 正在初始化数据库数据...
call npm run init

REM 启动应用
echo 正在启动应用...
echo ==========================================
echo 访问地址:
echo 前台: http://localhost:3000
echo 后台: http://localhost:3000/admin/login
echo ==========================================
echo 默认管理员账号:
echo 邮箱: admin@jingtian.com
echo 密码: admin123
echo ==========================================

call npm start
pause