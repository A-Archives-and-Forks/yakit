# 解码 p12 文件
echo "$CERT_BASE64" | base64 --decode >cert.p12

# 创建一个临时钥匙串，并导入证书（这里不设置密码）
security create-keychain -p "" build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p "" build.keychain
security import cert.p12 -k build.keychain -P $CERT_PASSWORD -T /usr/bin/codesign

# 设置钥匙链分区列表; 允许这些工具访问: apple-tool:,apple:,codesign:
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "" build.keychain

# 从钥匙串中查找包含 TEAM_ID 的签名证书标识
CERT_ID=$(security find-identity -v -p codesigning | grep "$TEAM_ID" | head -n1 | awk -F\" '{print $2}')
echo "Using certificate: $CERT_ID"

# 对 yak 可执行文件进行签名（请替换为你的可执行文件路径）
echo "signing mac amd64 engine"
codesign --timestamp --options runtime --sign "$CERT_ID" ./bins/yak_darwin_amd64
zip ./bins/yak_darwin_amd64.zip ./bins/yak_darwin_amd64 && rm ./bins/yak_darwin_amd64
echo "signing mac arm64 engine"
codesign --timestamp --options runtime --sign "$CERT_ID" ./bins/yak_darwin_arm64
zip ./bins/yak_darwin_arm64.zip ./bins/yak_darwin_arm64 && rm ./bins/yak_darwin_arm64
