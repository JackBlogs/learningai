1. index.html 不再内嵌 README 内容
- 页面打开时通过 fetch('README.md') 动态读取 README.md
- 修改 README.md 后，刷新页面即可同步最新内容
- 主题样式保持不变

2. 新增本地服务器脚本
- serve.py：Python 启动脚本
- serve.sh：Shell 启动脚本

3. 使用方式 在 learningai/index 目录下执行：
python3 serve.py
或
./serve.sh
然后访问 http://localhost:8000/index.html。
注意：由于浏览器安全限制，直接双击打开 index.html 可能无法加载 README.md，必须通过本地服务器访问。