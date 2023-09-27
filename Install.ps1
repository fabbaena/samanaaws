$InetPubFolder="C:\InetPub"
$SamanaAwsFolder=$InetPubFolder + "\SamanaAws"
$SamanaAwsSrc=$SamanaAwsFolder + "\src"
$f = New-Item -Path $SamanaAwsFolder -ItemType Directory
Copy-Item -Recurse -Path .\html $SamanaAwsFolder
Copy-Item -Recurse -Path .\Logs $SamanaAwsFolder
Copy-Item -Recurse -Path .\Profile $SamanaAwsFolder
Copy-Item -Recurse -Path .\src $SamanaAwsFolder
Set-Location $InetPubFolder
python -m venv SamanaAws
.\SamanaAws\Scripts\Activate.ps1
$installdata = python -m pip install boto3 flask
$ACL = Get-Acl C:\inetpub\SamanaAws\Logs
$AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS","Modify","ContainerInherit,ObjectInherit", "None", "Allow")
$ACL.SetAccessRule($AccessRule)
$ACL | Set-Acl -Path c:\InetPub\SamanaAws\Logs
import-module webadministration
New-WebAppPool -Name SamanaAws
$folder = "c:\InetPub\SamanaAws\html"
$Website = New-Website -Name "SamanaAws" -HostHeader "*" -Port 8099 -PhysicalPath $folder  -ApplicationPool SamanaAws -IPAddress 127.0.0.1
