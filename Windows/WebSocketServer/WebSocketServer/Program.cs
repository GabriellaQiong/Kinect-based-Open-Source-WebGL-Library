using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Alchemy;
using Alchemy.Classes;
using System.Collections.Concurrent;
using System.Threading;

using System.IO;
using Microsoft.Kinect;


// Modified from:
// http://divyen.wordpress.com/2012/06/13/html5-developing-websocket-server-using-c-sharp-dot-net/


class Program
{
	protected static ConcurrentDictionary<string, UserContext> onlineConnections;	// Thread-safe collection of online connections.
	private static KinectSensor sensor;												// Active Kinect sensor.
	private static DepthImagePixel[] depthPixels;									// Intermediate storage for the depth data received from the camera.
	private static byte[] transferData;												// Data to send via WebSocket.

	static void Main(string[] args)
	{
		onlineConnections = new ConcurrentDictionary<string, UserContext>();

		var aServer = new WebSocketServer(8100, System.Net.IPAddress.Any)
		{
			OnReceive = OnReceive,
			OnSend = OnSend,
			OnConnected = OnConnect,
			OnDisconnect = OnDisconnect,
			TimeOut = new TimeSpan(0, 5, 0)
		};
		aServer.Start();

		Console.WriteLine("Running Alchemy WebSocket Server ...");
		Console.WriteLine("[Type \"exit\" and hit enter to stop the server]");

		initializeKinect();
		Console.WriteLine("Kinect initialization has finished.");

		// Accept commands on the console and keep it alive
		var command = string.Empty;
		while (command != "exit")
		{
			command = Console.ReadLine();
		}

		// Stop Kinect.
		if (null != sensor)
		{
			sensor.Stop();
		}

		aServer.Stop();
	}


	public static void initializeKinect()
	{
		// Look through all sensors and start the first connected one.
		// This requires that a Kinect is connected at the time of app startup.
		// To make your app robust against plug/unplug, 
		// it is recommended to use KinectSensorChooser provided in Microsoft.Kinect.Toolkit (See components in Toolkit Browser).
		foreach (var potentialSensor in KinectSensor.KinectSensors)
		{
			if (potentialSensor.Status == KinectStatus.Connected)
			{
				sensor = potentialSensor;
				break;
			}
		}

		if (null != sensor)
		{
			// Turn on the depth stream to receive depth frames
			sensor.DepthStream.Enable(DepthImageFormat.Resolution640x480Fps30);

			// Allocate space to put the depth pixels we'll receive
			depthPixels = new DepthImagePixel[sensor.DepthStream.FramePixelDataLength];
			transferData = new byte[depthPixels.Length];

			// Add an event handler to be called whenever there is new depth frame data
			sensor.DepthFrameReady += SensorDepthFrameReady;

			// Start the sensor!
			try
			{
				sensor.Start();
			}
			catch (IOException)
			{
				sensor = null;
			}
		}

		if (null == sensor)
		{
			Console.WriteLine("Kinect is not ready (please restart server).");
		}
	}

	private static void SensorDepthFrameReady(object sender, DepthImageFrameReadyEventArgs e)
	{
		using (DepthImageFrame depthFrame = e.OpenDepthImageFrame())
		{
			if (depthFrame != null)
			{
				// Copy the pixel data from the image to a temporary array
				depthFrame.CopyDepthImagePixelDataTo(depthPixels);

				// Get the min and max reliable depth for the current frame
				int minDepth = depthFrame.MinDepth;
				int maxDepth = depthFrame.MaxDepth;

				// Convert depth from short to byte.
				for (int i = 0; i < depthPixels.Length; ++i)
				{
					// Get the depth for this pixel
					short depth = depthPixels[i].Depth;

					// Note: Using conditionals in this loop could degrade performance.
					// Consider using a lookup table instead when writing production code.
					// See the KinectDepthViewer class used by the KinectExplorer sample
					// for a lookup table example.
					transferData[i] = (byte)(depth / 256);
				}
			}
		}

		foreach (var conn in onlineConnections)
		{
			try
			{
				onlineConnections[conn.Key].Send(transferData);
			}
			catch (Exception ex)
			{
				Console.WriteLine(ex.Message);
			}
		}
	}


	public static void OnConnect(UserContext aContext)
	{
		Console.WriteLine("Client connected from: " + aContext.ClientAddress.ToString());

		// Add a connection Object to thread-safe collection
		onlineConnections.TryAdd(aContext.ClientAddress.ToString(), aContext);
	}


	public static void OnReceive(UserContext aContext)
	{
		try
		{
			Console.WriteLine("Data received from [" + aContext.ClientAddress.ToString() + "] - " + aContext.DataFrame.ToString());

		}
		catch (Exception ex)
		{
			Console.WriteLine(ex.Message.ToString());
		}
	}


	public static void OnSend(UserContext aContext)
	{
		Console.WriteLine("Data sent to: " + aContext.ClientAddress.ToString());
	}


	public static void OnDisconnect(UserContext aContext)
	{
		Console.WriteLine("Client disconnected: " + aContext.ClientAddress.ToString());

		// Remove the UserContext Object from the thread-safe collection.
		UserContext userContext;
		onlineConnections.TryRemove(aContext.ClientAddress.ToString(), out userContext);
	}
}

