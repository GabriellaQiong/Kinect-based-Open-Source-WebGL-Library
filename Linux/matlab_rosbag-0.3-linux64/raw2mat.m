% Written by Qiong Wang 06/2013 at University of Pennsylvania.

function [mat] = raw2mat(raw, acc1, acc2, acc3)
% RAW2MAT Convert ROS raw messages to a matrix 
% MAT = RAW2MAT(raw, acc1) Returns an M-by-N matrix where M is the number
% of fields in each message and N is the length of msgs.  acc1 is a 
% function which takes a message and returns a number.
%
% MAT = RAW2MAT(msgs, acc1, acc2) or MAT = RAW2MAT(msgs, acc1, acc2, acc3)  
% Applies the function to each accessor.

if nargin < 3
    acc = acc1;
elseif nargin < 4
    acc = @(raw) [acc1(raw),acc2(raw)];
else
    acc = @(raw) [acc1(raw),acc2(raw),acc3(raw)];
end
columnify = @(x) x(:);
mat = cellfun(@(x) columnify(acc(x)), raw, 'UniformOutput', false);
mat = [mat{:}];
end
