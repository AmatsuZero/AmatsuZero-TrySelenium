# 安装必须环境依赖
brew install google-chrome chromedriver

# 检查 Chrome 与 Driver 版本是否一致
version=($(/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version))
cv=${version[2]}

version=($(chromedriver --version))
dv=${version[1]}

echo "🎉 安装完毕，Google Chrome 版本为：${cv}，驱动版本为：${dv}"