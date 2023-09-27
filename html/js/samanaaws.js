aws_path="/aws"

function ToggleNewInstanceForm() {
	$(".NewInstanceForm").toggle();
}
function AjaxError(jqXHR, textStatus, errorThrown) {
	if(jqXHR.responseJSON != undefined) {
		alert(jqXHR.responseJSON.error);
	} else {
		alert("Error");
		console.log(jqXHR);
	}
}
function RunInstance() {
	NewInstanceData = {
		"ImageId": undefined, 
		"InstanceType": undefined, 
		"SecurityGroupIds": [], 
		"SubnetId": undefined, 
		"Count": 0, 
		"TagSpecifications": [ { "ResourceType": "instance", "Tags": [] } ]
		};
	NewInstanceInput = $("input.NewInstance")
	for(i=0; i < NewInstanceInput.length; i++) {
		if(NewInstanceInput[i].name.substring(0, 3) == "tag") {
			tagKey = NewInstanceInput[i].name.substring(4);
			tagValue = NewInstanceInput[i].value;
			NewInstanceData["TagSpecifications"][0]["Tags"].push({ "Key": tagKey, "Value": tagValue });
		} else if (NewInstanceInput[i].name == "SecurityGroupIds") {
			NewInstanceData[NewInstanceInput[i].name] = NewInstanceInput[i].value.split(",")
		} else {
			NewInstanceData[NewInstanceInput[i].name] = NewInstanceInput[i].value;
		}
	}
	$.ajax({
		url: aws_path + "/run_instances",
		success: TableAddInstances,
		data: JSON.stringify(NewInstanceData),
		contentType: "application/json; charset=utf-8",
		method: "POST",
		error: AjaxError
		});
	alert("Instance creation request sent.");
	$(".NewInstanceForm").hide();
}
function DescribeInstances() {
	Filters = GenerateFiltersObject();
	$(".InstanceData").remove();
	$.ajax({
		url: aws_path + "/describe_instances",
		success: TableAddReservations,
		data: JSON.stringify(Filters),
		error: AjaxError,
		method: "POST",
		contentType: "application/json; charset=utf-8",
	});
}
function TableAddReservations(data) {
	data["Reservations"].forEach(TableAddInstances);
}
function TableAddInstances(instances) {
	instances["Instances"].forEach(TableAddInstance);
}
function getTag(TagList, Key) {
	for(t=0; t<TagList.length; t++) {
		if(TagList[t]["Key"] == Key) {
			return TagList[t]["Value"];
		}
	}
	return undefined;
}
function TableAddInstance(instance) {
	row = $("<tr>").addClass("InstanceData").attr("InstanceId", instance['InstanceId']);
	row.data(instance);
	row.on("click", SelectRow);
	row.append($("<td>").append(getTag(instance['Tags'], "Name")));
	row.append($("<td>").append(instance['InstanceId']));
	row.append($("<td>").append(instance['ImageId']));
	row.append($("<td>").append(instance['InstanceType']));
	row.append($("<td>").append(instance['State']['Name']));
	row.append($("<td>").append(instance['PrivateIpAddress']));
	row.append($("<td>").append(instance['SubnetId']));
	row.append($("<td>").append(instance['SecurityGroups'].map(x => x.GroupId).join(",")));
	actions = $("<td>");
	$(".AllInstances").append(row);
}
function SelectRow(e) {
	
	row = $(e.target).parents("tr");
	row.siblings().removeClass("Selected");
	row.addClass("Selected");
}
function TerminateInstances(e) {
	instance = $(".InstanceData.Selected");
	if(instance.length == 0) {
		alert("Select an instance to continue");
		return;
	}
	if(instance.data().State.Name == "terminated") {
		alert("Instance already terminated.");
		return;
	}
	InstanceId = instance.attr("InstanceId")
	if(confirm("Do you really want to delete instance " + InstanceId + "?")) {
		$.ajax({
			url: aws_path + "/terminate_instances",
			method: "POST",
			success: function(data) { console.log(data); },
			data: JSON.stringify({ "InstanceIds": [ InstanceId ] }),
			contentType: "application/json; charset=utf-8",
			error: AjaxError
		});
	}
}
function StopInstances(e) {
	instance = $(".InstanceData.Selected");
	if(instance.length == 0) {
		alert("Select an instance to continue");
		return;
	}
	if(instance.data().State.Name != "running") {
		alert("Instance must be in stopped state to continue.");
		return;
	}
	InstanceId = instance.attr("InstanceId")
	if(confirm("Do you really want to stop instance " + InstanceId + "?")) {
		$.ajax({
			url: aws_path + "/stop_instances",
			method: "POST",
			success: function(data) { console.log(data); },
			data: JSON.stringify({ "InstanceIds": [ InstanceId ] }),
			contentType: "application/json; charset=utf-8",
			error: AjaxError
		});
	}
}
function StartInstances(e) {
	instance = $(".InstanceData.Selected");
	if(instance.length == 0) {
		alert("Select an instance to continue");
		return;
	}
	if(instance.data().State.Name != "stopped") {
		alert("Instance must be in stopped state to continue.");
		return;
	}
	InstanceId = instance.attr("InstanceId")
	if(confirm("Do you really want to start instance " + InstanceId + "?")) {
		$.ajax({
			url: aws_path + "/start_instances",
			method: "POST",
			success: function(data) { console.log(data); },
			data: JSON.stringify({ "InstanceIds": [ InstanceId ] }),
			contentType: "application/json; charset=utf-8",
			error: AjaxError
		});
	}
}
function SnapshotInstance(e) {
	instance = $(".InstanceData.Selected");
	if(instance.length == 0) {
		alert("Select an instance to continue");
		return;
	}
	if(instance.data().State.Name != "stopped") {
		alert("Instance must be in stopped state to continue.");
		return;
	}
	InstanceId = instance.attr("InstanceId")
	if(confirm("Do you really want to snapshot instance " + InstanceId + "?")) {
		description = prompt("Please enter the name of the snapshot", "");

		$.ajax({
			url: aws_path + "/snapshot_instance",
			method: "POST",
			success: SnapshotList,
			data: JSON.stringify({ "InstanceIds": [ InstanceId ], "Description": description }),
			contentType: "application/json; charset=utf-8",
			error: AjaxError
		});
	}
}
function DescribeSnapshots(Filters, success) {
	$.ajax({
		url: aws_path + "/describe_snapshots",
		success: ShowSnapshotList,
		data: JSON.stringify(Filters),
		error: AjaxError,
		contentType: "application/json; charset=utf-8",
		method: "POST",
	});
}
function SnapshotList(e) {
	instance = $(".InstanceData.Selected");
	if(instance.length == 0) {
		alert("Select an instance to continue");
		return;
	}
	InstanceId = instance.attr("InstanceId");

	instance_data = instance.data();
	VolumeId = instance_data.BlockDeviceMappings[0].Ebs.VolumeId 
	Filters = {'Filters': [ { "Name": "tag:InstanceId", "Values": [ instance_data['InstanceId'] ] } ]};
	DescribeSnapshots(Filters, ShowSnapshotList);
	$(".SnapshotsTable").data(instance_data);
}
function ShowSnapshotList(data) {
	console.log(data);
	instance = $(".InstanceData.Selected");
	$(".SnapshotsTable .Title").html(instance.attr("InstanceId"))
	table = $(".SnapshotsTable table");
	$(".SnapshotData").remove();
	for(s=0; s<data.Snapshots.length; s++) {
		snapshot = data.Snapshots[s];
		row = $("<tr>").addClass("SnapshotData").data(snapshot);
		row.append($("<td>")
			.append($("<button>").text("Revert").on("click", RevertInstance))
			.append($("<button>").text("Delete").on("click", DeleteSnapshot)));
		row.append($("<td>").text(snapshot.SnapshotId));
		row.append($("<td>").text(snapshot.Description));
		row.append($("<td>").text(snapshot.StartTime));
		row.append($("<td>").text(snapshot.State));
		table.append(row);
	}
	$(".SnapshotsTable").show();
}
function RevertInstance(e) {
	snapshot = $(e.target).parents("tr").data();
	instance = $(".SnapshotsTable").data();
	console.log(snapshot);
	console.log(instance);
	$.ajax({
		url: aws_path + "/revert_instance",
		success: function(data) {  },
		data: JSON.stringify({"instance":instance, "snapshot":snapshot}),
		error: AjaxError,
		contentType: "application/json; charset=utf-8",
		method: "POST",
	});
}
function DeleteSnapshot(e) {
	snapshot = $(e.target).parents("tr").data();
	console.log(snapshot);
	$.ajax({
		url: aws_path + "/delete_snapshot",
		success: SnapshotList,
		data: JSON.stringify({"SnapshotId":snapshot.SnapshotId}),
		error: AjaxError,
		contentType: "application/json; charset=utf-8",
		method: "POST",
	});
}
function RevertDone(data) {
	console.log(data);
	alert("Revert Done");
	$(".SnapshotsTable").hide();
}
function AddFilter(e) {
	table = $(".FiltersForm > table");
	row = $("<tr>").addClass("FilterRow");
	row.append($("<td>").html($("<input>").addClass("FilterKey").val(e.data.key)));
	row.append($("<td>").html($("<input>").addClass("FilterValue").val(e.data.value)));
	row.append($("<td>").html($("<button>").text("X").on("click", RemoveFilter)));
	table.append(row);
}
function ResetFilters() {
	$(".FilterRow").remove();
	AddFilter({"data": {"key": "tag:XdConfig", "value": "XdProvisioned=true"}});
}
function RemoveFilter(e) {
	FilterRow=$(e.target).parents("tr");
	FilterRow.remove();
}
function GenerateFiltersObject() {
	Filters = [];
	allFilterRows = $(".FilterRow");
	for(i=0; i < allFilterRows.length; i++) {
		row = $(allFilterRows[i]);
		key = row.find("input.FilterKey").val();
		value = row.find("input.FilterValue").val();
		Filters.push({"Name": key, "Values": [value] });
	}
	return Filters;
}

function toggleWindow(e) {
	btn = $(e.target);
	w = e.data.window;
	w.css("top", btn.offset().top + btn.height());
	w.css("left", btn.offset().left + 10);				
	w.toggle(); 
}
function AddImages(data) {
	table = $(".ImagesTable > Table");
	for(i=0; i < data.Images.length; i++) {
		image = data.Images[i];
		row = $("<tr>").addClass("ImageRow").data(image);
		row.append($("<td>").text(image.Description));
		row.append($("<td>").text(image.ImageId));
		row.append($("<td>").text(image.PlatformDetails));
		table.append(row);
	}
	if(data.Images.length == 0) {
		row = $("<tr>").addClass("ImageRow");
		row.append($("<td>").attr("colspan", 3).text("No data"));
		table.append(row);
	}
	$("#btnImagesSearch").data().NextToken = data.NextToken;
	console.log(data);
}
function DescribeImages(args) {
	$.ajax({
		url: aws_path + "/describe_images",
		success: AddImages,
		data: JSON.stringify(args),
		error: AjaxError,
		method: "POST",
		contentType: "application/json; charset=utf-8",
	});
}
function SearchImages(e) {
	args={"MaxResults": 20, "Filters": [{"Name": "description", "Values": [ $("#inpImageDescFilter").val() ]}], "NextToken": ""};
	$("#btnImagesSearch").data(args)
	DescribeImages(args);
}
function ClearImages(e) {
	$(".ImageRow").remove();
	$("#btnImagesSearch").data({});
}
function NextImages(e) {
	ClearImages();
	DescribeImages($("#btnImagesSearch").data());
}
function CreateImage(e) {
	args = { 
		"InstanceId": $(".CreateImage[name='InstanceId']").val(),
		"Name": $(".CreateImage[name='Name']").val(),
		"Description": $(".CreateImage[name='Description']").val()
	};
	$.ajax({
		url: aws_path + "/create_image",
		success: function(data) { console.log(data); },
		data: JSON.stringify(args),
		contentType: "application/json; charset=utf-8",
		method: "POST",
		error: AjaxError
		});
}
function toggleTabs(e) {
	btn = $(e.target);
	$("button.Tabs").removeClass("Selected");
	btn.addClass("Selected");
	classname = btn.attr("tabclass");
	$(".Tabs").addClass("TabInvisible").removeClass("TabVisible");
	$("." + classname).addClass("TabVisible").removeClass("TabInvisible");
}
function RegionChange(e) {
	console.log(e.target.value)
	document.cookie = "region=" + e.target.value;
	DescribeInstances();
}