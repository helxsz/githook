echo "stop the current application"
forever stop /home/ubuntu/node/fablab/app.js
echo "download the git"
git clone https://github.com/helxsz/sensorexample.git
echo "remove the previous repository"
rm -rf /home/ubuntu/node/fablab
echo "replace the latest repository"
mv sensorexample fablab
mv fablab /home/ubuntu/node/
echo "installing npm dependencies"
cd /home/ubuntu/node/fablab
#npm install
echo "restart the current application"
NODE_ENV=production forever start /home/ubuntu/node/fablab/app.js