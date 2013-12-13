WebGL Shader Editor with Kinect Data
======================================


Takashi Furuya, Qiong Wang
------------------------------------


**Final Project for CIS 565 GPU Programming, Fall 2013**

------------------------------------


This is work in progress.

About this project:

https://docs.google.com/document/d/1TlyWD7UQz0TsvjX7qm6a8AISIgpL6dFSIpwJI2IIV-c/edit?usp=sharing

Alpha presentation:

https://docs.google.com/presentation/d/1GgohxoH85cNcYGkluDJ-QHQdxUQi6bjtzMOLci3d2gk/edit?usp=sharing


Note 1:

Windows project references [Alchemy](http://alchemywebsockets.net/).
Git clone, set to release mode, build, and copy Alchemy.dll to Windows/WebSocketServer/WebSocketServer/lib/Alchemy.dll

Note 2:

Need admin privilege to run server.


Known Issues:

Windows:

- There is a black stripe on the left side of the canvas regardless of input.



---
INSTRUCTIONS
---
**Windows**
------------------

  Windows project references [Alchemy](http://alchemywebsockets.net/).
  Git clone, set to release mode, build, and copy Alchemy.dll to Windows/WebSocketServer/WebSocketServer/lib/Alchemy.dll

**Linux** 
-------------------------------
**(tested on Ubuntu 12.04 precise)**

* Build the [*libfreenect*](https://github.com/OpenKinect/libfreenect) library by the following commands (there is something wrong to show the library directly in our repo):

```
cd libfreenect/wrapper/python

cmake CMakeLists.txt

make

sudo python setup.py install
```
* Download the newest version of *easyInstall* from https://pypi.python.org/pypi/setuptools and extract it in any directory
* Use the following commands to add the pylzma, autobahn.websocket module

```
sudo easy_install pylzman

sudo easy_install autobahn
```
---
RESULTS
---
This is the 3D Point Cloud show the depth with a control panel to tune the RGBA value, point size along with the morphing ratio of x and y axes.

![ScreenShot](https://raw.github.com/GabriellaQiong/Kinect-based-Open-Source-WebGL-Library/master/Screenshots/depth1.png)


Here is our video demo.

[![ScreenShot](https://raw.github.com/GabriellaQiong/Kinect-based-Open-Source-WebGL-Library/master/Screenshots/screenshot_vid.jpg)](http://www.youtube.com/watch?v=P4wDHG441ig)

---
THIRD-PARTY CODE
---
 
The base code for websocket and depth display is from Elespuru's github: https://github.com/elespuru/kinect-ws-depth-vid

Elespuru forked his project from George MacKerron's depthcam project:
https://github.com/jawj/websocket-kinect

George MacKerron's blog: 
http://blog.mackerron.com/2012/02/03/depthcam-webkinect/

