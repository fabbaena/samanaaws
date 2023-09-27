from flask import Flask, Response, request
import boto3, json, time, os

app = Flask(__name__)
application = app

ec2_us_east_1 = boto3.client('ec2', region_name="us-east-1")
ec2_us_east_2 = boto3.client('ec2', region_name="us-east-2")
ec2_us_west_2 = boto3.client('ec2', region_name="us-west-2")
timeout = 30

def send_error(msg):
    return Response(json.dumps({"error": str(msg)}), 
        status=400, 
        mimetype='application/json', 
        headers={"Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type"})

def send_data(data):
    return Response(json.dumps(data, default=str), 
        mimetype='application/json', 
        headers={"Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type"})

def get_tag(taglist, key):
    for tag in taglist:
        if tag['Key'] == key:
            return tag['Value']
    return None

def region():
    region = request.cookies.get('region')
    if region == "us-east-1":
        return ec2_us_east_1
    elif region == "us-east-2":
        return ec2_us_east_2
    elif region == "us-west-2":
        return ec2_us_west_2
    raise Exception("Invalid Region")


@app.route('/describe_instances', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/describe_instances', methods=[ "POST", "OPTIONS" ])
def describe_instances():
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        filters = request.get_json()
        if not isinstance(filters, list):
            return send_error("Invalid input. Expecting list")
        response = ec2.describe_instances(Filters=filters)
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/describe_images', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/describe_images', methods=[ "POST", "OPTIONS" ])
def describe_images():
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        args = request.get_json()
        if not isinstance(args, dict):
            return send_error("Invalid input. Expecting object");
        response = { "Images": [], "NextToken": args.get('NextToken', ""), "ResponseMetadata": {}, "RequestCount": 0 }
        while True:
            response['RequestCount'] += 1
            r = ec2.describe_images(MaxResults=args.get('MaxResults', args.get("MaxResults", 20)), 
                Filters=args.get('Filters', []), 
                NextToken=response['NextToken'])
            response['Images'] += r['Images']
            response['NextToken'] = r.get('NextToken', None)
            response['ResponseMetadata'] = r.get('ResponseMetadata', {})
            if len(response['Images']) >= args.get('MaxResults', 20) or response['NextToken'] is None or response['RequestCount'] > 29:
                break
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/create_image', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/create_image', methods=[ "POST", "OPTIONS" ])
def create_image():
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        data = request.get_json()
        if 'InstanceId' not in data or 'Name' not in data or 'Description' not in data:
            return send_error("Missing mandatory parameter(InstanceId, Name and Description).")
        instance_list = ec2.describe_instances(InstanceIds=[data['InstanceId']])
        if len(instance_list['Reservations']) < 1 or len(instance_list['Reservations'][0]['Instances']) < 1:
            return send_error("Could not find instance %s" % data['InstanceId'])
        instance = instance_list['Reservations'][0]['Instances'][0]
        if instance['State']['Name'] != "stopped":
            return send_error("Instance is in invalid state (%s)" % instance['State']['Name'])
        response = ec2.create_image(InstanceId=instance['InstanceId'],
            Name = data['Name'],
            Description = data['Description'],
            TagSpecifications=[{
                'ResourceType': 'image',
                'Tags': [ {'Key': 'InstanceId', 'Value': instance['InstanceId'] } ] 
            }])
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/terminate_instances', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/terminate_instances', methods=[ "POST", "OPTIONS" ])
def terminate_instances():
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        data = request.get_json()
        response = ec2.terminate_instances(InstanceIds=data['InstanceIds'])
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/stop_instances', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/stop_instances', methods=[ "POST", "OPTIONS" ])
def stop_instances():
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        data = request.get_json()
        response = ec2.stop_instances(InstanceIds=data['InstanceIds'])
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/start_instances', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/start_instances', methods=[ "POST", "OPTIONS" ])
def start_instances():
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        data = request.get_json()
        response = ec2.start_instances(InstanceIds=data['InstanceIds'])
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/run_instances', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/run_instances', methods=[ "POST", "OPTIONS" ])
def run_instances():
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        data = request.get_json()
        response = ec2.run_instances(ImageId=data['ImageId'], 
            InstanceType=data['InstanceType'], 
            SecurityGroupIds=data['SecurityGroupIds'], 
            SubnetId=data['SubnetId'], 
            TagSpecifications=data['TagSpecifications'], 
            MinCount=int(data['Count']),
            MaxCount=int(data['Count']),
            UserData=data.get("UserData", ""),
            KeyName='fabianb')
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/snapshot_instance', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/snapshot_instance', methods=[ "POST", "OPTIONS" ])
def snapshot_instance():
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        data = request.get_json()
        instance_list = ec2.describe_instances(InstanceIds=data['InstanceIds'])
        instance = instance_list['Reservations'][0]['Instances'][0]
        if instance['State']['Name'] != "stopped":
            return send_error("Instance is in invalid state (%s)" % instance['State']['Name'])
        if len(instance['BlockDeviceMappings']) != 1:
            return send_error("Not Supported - instance has more than one volume attached")
        VolumeId = instance['BlockDeviceMappings'][0]['Ebs']['VolumeId']
        response = ec2.create_snapshot(VolumeId=VolumeId, 
                Description=data.get('Description', 'samanaaws'), TagSpecifications=[{
            'ResourceType': 'snapshot',
            'Tags': [ {'Key': 'InstanceId', 'Value': instance['InstanceId'] } ] 
            }])
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/describe_snapshots', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/describe_snapshots', methods=[ "POST", "OPTIONS" ])
def describe_snapshots():
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        data = request.get_json()
        if 'Filters' not in data:
            return send_error("Mandatory parameter missing \"Filter\".")
        response = ec2.describe_snapshots(Filters=data['Filters'])
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/delete_snapshot', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/delete_snapshot', methods=[ "POST", "OPTIONS" ])
def delete_snapshot():
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        data = request.get_json()
        if 'SnapshotId' not in data:
            return send_error("Mandatory parameter missing \"SnapshotId\".")
        response = ec2.delete_snapshot(SnapshotId=data['SnapshotId'])
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/revert_instance', methods=[ "POST", "OPTIONS" ])
@app.route('/aws/revert_instance', methods=[ "POST", "OPTIONS" ])
def revert_instance():
    global timeout
    if request.method == 'OPTIONS':
        return send_data({})

    try:
        ec2 = region()
        data = request.get_json()
        instance = data.get('instance')
        snapshot = data.get('snapshot')
        oldVolumeId = instance['BlockDeviceMappings'][0]['Ebs']['VolumeId']
        DeviceName = instance['BlockDeviceMappings'][0]['DeviceName']
        if instance is None:
            return send_error("Data missing(instance)")
        if snapshot is None:
            return send_error("Data missing(snapshot)")
        if instance['State']['Name'] != 'stopped':
            return send_error("Invalid instance state. Must be stopped.")
        if snapshot['State'] != 'completed':
            return send_error("Invalid snapshot state. Must be completed.")
        newvol = ec2.create_volume(SnapshotId=snapshot['SnapshotId'], AvailabilityZone=instance['Placement']['AvailabilityZone'])
        start_time = time.time()
        while True:
            nvs = ec2.describe_volumes(VolumeIds=[newvol['VolumeId']])
            newvol = nvs['Volumes'][0]
            if newvol['State'] == 'available':
                break
            time.sleep(5)
            if time.time() - start_time > timeout:
                ec2.delete_volume(VolumeId=newvol['VolumeId'])
                return send_error("Timed out waiting for volume to be created..")
        ec2.detach_volume(VolumeId=oldVolumeId, InstanceId=instance['InstanceId'])
        while True:
            ovs = ec2.describe_volumes(VolumeIds=[oldVolumeId])
            oldVolume = ovs['Volumes'][0]
            if oldVolume['State'] == 'available':
                break
            time.sleep(5)
            if time.time() - start_time > timeout:
                return send_error("Timed out waiting for volume to be detached.")
        ec2.delete_volume(VolumeId=oldVolumeId)
        response = ec2.attach_volume(VolumeId=newvol['VolumeId'], InstanceId=instance['InstanceId'], Device=DeviceName)
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

@app.route('/')
@app.route('/aws')
def index():
    try:
        response = {}
    except Exception as e:
        return send_error(str(e))
    return send_data(response)
 
@app.route('/test')
@app.route('/aws/test')
def test():
    try:
        response = {"message": "This is a test"}
    except Exception as e:
        return send_error(str(e))
    return send_data(response)

if __name__ == "__main__":
    app.run(debug=True)