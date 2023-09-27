$InetPubFolder="C:\InetPub"
$SamanaAwsFolder=$InetPubFolder + "\SamanaAws"
$SamanaAwsSrc=$SamanaAwsFolder + "\src"
Copy-Item -Recurse -Path .\html $SamanaAwsFolder
Copy-Item -Recurse -Path .\src $SamanaAwsFolder
