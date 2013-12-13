// Server.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Alchemy;
using Alchemy.Classes;
using System.Collections.Concurrent;
using System.Threading;

// Kinect.
using System.IO;
using Microsoft.Kinect;

// Timer.
using System.Diagnostics;


// Modified from:
// http://divyen.wordpress.com/2012/06/13/html5-developing-websocket-server-using-c-sharp-dot-net/


enum Modes
{
	Depth1Byte,
	RGB,
	XYZ,
	Depth2Bytes
};

class Program
{
	protected static ConcurrentDictionary<string, UserContext> onlineConnections;	// Thread-safe collection of online connections.
	private static KinectSensor sensor;					// Active Kinect sensor.
	private static DepthImagePixel[] depthImagePixels;	// Intermediate storage for the depth data received from the camera.
	private static short[] depthPixels;					// Same as above.

	private static byte[] transferData;					// Data to send via WebSocket (points to one of the below).
	private static byte[] depth1Packet;					// 1 byte depth data to send via WebSocket.
	private static byte[] colorPacket;					// 3 bytes RGB data to send via WebSocket.
	private static byte[] positionPacket;				// 12 bytes XYZ float data to send via WebSocket.
	private static byte[] depth2Packet;					// 2 bytes depth data to send via WebSocket.

	private static Stopwatch stopwatch;					// To measure execution time taken to process kinect data before sending.
	private static Modes mode;

	static void Main(string[] args)
	{
		onlineConnections = new ConcurrentDictionary<string, UserContext>();
		stopwatch = new Stopwatch();
		mode = Modes.Depth1Byte;
		//mode = Modes.RGB;

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
			// Turn on streaming to receive frames.
			sensor.DepthStream.Enable(DepthImageFormat.Resolution640x480Fps30);
			sensor.ColorStream.Enable(ColorImageFormat.RgbResolution640x480Fps30);

			// Allocate space to put the depth pixels we'll receive.
			depthImagePixels = new DepthImagePixel[sensor.DepthStream.FramePixelDataLength];
			depthPixels = new short[sensor.DepthStream.FramePixelDataLength];// 640*480 = 307200.
			depth1Packet = new byte[sensor.DepthStream.FramePixelDataLength];
			colorPacket	 = new byte[640 * 480 * 3];		// sensor.ColorStream.FramePixelDataLength = 640*480*4.
			positionPacket = new byte[640 * 480 * 12];	// = 3686400.
			depth2Packet = new byte[640 * 480 * 2];		// = 614400.
			SwitchTransferData();

			// Add an event handler to be called whenever there is new depth/color frame data.
			sensor.DepthFrameReady += SensorDepthFrameReady;
			sensor.ColorFrameReady += SensorColorFrameReady;
			
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
			Console.WriteLine("Kinect is not ready (please restart program).");
		}
		else
		{
			Console.WriteLine("Kinect initialization has successfully completed.");
		}
	}


	private static void SensorDepthFrameReady(object sender, DepthImageFrameReadyEventArgs e)
	{
		if (mode == Modes.RGB) return;

		stopwatch.Restart();
		switch (mode)
		{
			case Modes.Depth1Byte:
				{
					using (DepthImageFrame depthFrame = e.OpenDepthImageFrame())
					{
						if (depthFrame != null)
						{
							// Copy the pixel data from the image to a temporary array
							depthFrame.CopyDepthImagePixelDataTo(depthImagePixels);

							// Get the min and max reliable depth for the current frame
							int minDepth = depthFrame.MinDepth;
							int maxDepth = depthFrame.MaxDepth;

							// Convert depth from short to byte.
							for (int i = 0; i < depthImagePixels.Length; ++i)
							{
								// Get the depth for this pixel
								short depth = depthImagePixels[i].Depth;

								// Note: Using conditionals in this loop could degrade performance.
								// Consider using a lookup table instead when writing production code.
								// See the KinectDepthViewer class used by the KinectExplorer sample
								// for a lookup table example.
								depth1Packet[i] = (byte)(depth / 256);
								//transferData[i] = (byte)(depth >= minDepth && depth <= maxDepth ? depth : 0);
							}
						}
					}

					stopwatch.Stop();
					IncludeAtBeginningOf(ref depth1Packet, (UInt16)Modes.Depth1Byte, (UInt16)stopwatch.ElapsedMilliseconds);
					break;
				}

			case Modes.XYZ:
				{
					int k = 0;
					
					for (int i = 0; i < 640; ++i)
					{
						for (int j = 0; j < 480; ++j)
						{
							byte[] x = BitConverter.GetBytes((float)i);
							byte[] y = BitConverter.GetBytes((float)j);
							positionPacket[k++] = x[0];
							positionPacket[k++] = x[1];
							positionPacket[k++] = x[2];
							positionPacket[k++] = x[3];
							positionPacket[k++] = y[0];
							positionPacket[k++] = y[1];
							positionPacket[k++] = y[2];
							positionPacket[k++] = y[3];
							positionPacket[k++] = 0;
							positionPacket[k++] = 0;
							positionPacket[k++] = 0;
							positionPacket[k++] = 0;
						}
					}
					
					stopwatch.Stop();
					IncludeAtBeginningOf(ref positionPacket, (UInt16)Modes.XYZ, (UInt16)stopwatch.ElapsedMilliseconds);
					break;
				}

			case Modes.Depth2Bytes:
				{
					using (DepthImageFrame depthFrame = e.OpenDepthImageFrame())
					{
						if (depthFrame != null)
						{
							// Copy the pixel data from the image to a temporary array
							//depthFrame.CopyPixelDataTo(depthPixels);
							//Buffer.BlockCopy(depthPixels, 0, depth2Packet, 0, depth2Packet.Length);

							depthFrame.CopyDepthImagePixelDataTo(depthImagePixels);
							int k = 0;
							for (int i = 0; i < depthImagePixels.Length; ++i)
							{
								// Get the depth for this pixel
								short depth = depthImagePixels[i].Depth;
								byte[] depthArray = BitConverter.GetBytes(depth);
								depth2Packet[k++] = depthArray[0];
								depth2Packet[k++] = depthArray[1];
							}
						}
					}

					stopwatch.Stop();
					IncludeAtBeginningOf(ref depth2Packet, (UInt16)Modes.Depth2Bytes, (UInt16)stopwatch.ElapsedMilliseconds);
					break;
				}

			default:
				return;
		}
		SendData();
	}


	private static void SensorColorFrameReady(object sender, ColorImageFrameReadyEventArgs e)
	{
		if (mode != Modes.RGB) return;

		stopwatch.Restart();

		using (ColorImageFrame colorFrame = e.OpenColorImageFrame())
		{
			if (colorFrame != null)
			{
				// Copy the pixel data from the image to a temporary array.
				//colorFrame.CopyPixelDataTo(transferData);
				byte[] rawColorBytes = colorFrame.GetRawPixelData();
				int length = rawColorBytes.Length;
				int i = 0;
				int j = 0;
				while (i < length)
				{
					byte b = rawColorBytes[i++];
					byte g = rawColorBytes[i++];
					byte r = rawColorBytes[i++];
					colorPacket[j++] = r;
					colorPacket[j++] = g;
					colorPacket[j++] = b;
					++i;
				}
			}
		}

		stopwatch.Stop();
		IncludeAtBeginningOf(ref colorPacket, (UInt16) Modes.RGB, (UInt16)stopwatch.ElapsedMilliseconds);
		SendData();
	}


	public static void IncludeAtBeginningOf(ref byte[] data, UInt16 value1, UInt16 value2)
	{
		byte[] byteArray;
		byteArray = BitConverter.GetBytes(value1);
		data[0] = byteArray[0];
		data[1] = byteArray[1];
		byteArray = BitConverter.GetBytes(value2);
		data[2] = byteArray[0];
		data[3] = byteArray[1];
	}


	private static void SwitchTransferData()
	{
		switch (mode)
		{
			case Modes.Depth1Byte:
				transferData = depth1Packet;
				break;
			case Modes.RGB:
				transferData = colorPacket;
				break;
			case Modes.XYZ:
				transferData = positionPacket;
				break;
			case Modes.Depth2Bytes:
				transferData = depth2Packet;
				break;
		}
	}


	public static void SendData()
	{
		// Send data to client.
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
			Int16 option = BitConverter.ToInt16(aContext.DataFrame.AsRaw()[0].Array, 0);
			Console.WriteLine("Data received from [" + aContext.ClientAddress.ToString() + "] - " + option.ToString());
			
			if (mode != (Modes)option)
			{
				mode = (Modes)option;
				SwitchTransferData();
			}
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

