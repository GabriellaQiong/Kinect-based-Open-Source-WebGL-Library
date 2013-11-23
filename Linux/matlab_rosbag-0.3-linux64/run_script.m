% Run script of extract rosbag data in MATLAB
% Written by Qiong Wang 06/2013
clear rosbag_wrapper;
clear ros.Bag;
clear all;
clc;

%% Set up directories
bag_dir = '/home/qiong/';
p = mfilename('fullpath');
script_dir = fileparts(p);
bag_file = [bag_dir '2013-11-20-23-07-58.bag']; 
cd(script_dir);

%% Set up topics and bag
topic1 = '/camera/depth/disparity';
topic2 = '/camera/rgb/image_color';
topic3 = '/camera/depth/points';
bag = ros.Bag(bag_file);

%% Get information about the bag
bag.info()
bag.definition('sensor_msgs/PointCloud2');
bag.definition('sensor_msgs/Image');

%% Reread the bags.
disp_raw   = bag.readAll(topic1);
img_raw    = bag.readAll(topic2);
pts_raw    = bag.readAll(topic3);
image_size = [img_raw{1}.height, img_raw{1}.height];

%% Convert pose messages to a matrix and plot xy trajectory
data    = @(raw) raw.data;
images  = raw2mat(img_raw, data);
points  = raw2mat(pts_raw, data);

%% Process the images data
img_num = size(images,2);
rgb_img = cell(img_num, 1);

for i = 1 : img_num
    r = reshape(images(1:3:end, i), image_size(2), image_size(1))';
    g = reshape(images(2:3:end, i), image_size(2), image_size(1))';
    b = reshape(images(3:3:end, i), image_size(2), image_size(1))';
    rgb_img{i} = cat(3, b, g, r);
end

%% Save data
cd(bag_dir);
% save('disparity_data.mat','disparity');
save('image_data.mat','images');
save('point_clouds_data.mat','points');