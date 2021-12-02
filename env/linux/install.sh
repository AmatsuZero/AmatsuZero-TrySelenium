pushd ./env/linux

echo “即将下载 Chrome”

wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
sudo yum localinstall google-chrome-stable_current_x86_64.rpm

version=($(google-chrome --version))
v=${version[2]}
echo "下载完毕，版本是：${v}"

url="http://chromedriver.storage.googleapis.com/${v}/chromedriver_linux64.zip"
echo "即将下载 webdriver: ${url}"
wget $url

echo "解压中..."
unzip chromedriver_linux64.zip

echo "清理中..."
rm chromedriver_linux64.zip
rm google-chrome-stable_current_x86_64.rpm

echo "依赖准备完毕"

popd