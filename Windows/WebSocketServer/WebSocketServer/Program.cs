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

// Source from:
// http://divyen.wordpress.com/2012/06/13/html5-developing-websocket-server-using-c-sharp-dot-net/

namespace AlchemyWebSocketServer
{
    class Program
    {
        //Thread-safe collection of Online Connections.
        protected static ConcurrentDictionary<string, Connection> OnlineConnections = new ConcurrentDictionary<string, Connection>();

		private static KinectSensor sensor;			// Active Kinect sensor
		private static DepthImagePixel[] depthPixels;	// Intermediate storage for the depth data received from the camera
		

		static void Main(string[] args)
        {
            // instantiate a new server - acceptable port and IP range,
            // and set up your methods.

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
			Console.WriteLine("Kinect initialization end.");

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
				TransferData.depth = new byte[depthPixels.Length];
				//TransferData.depth = new byte[10];

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
				Console.WriteLine("No Kinect Ready");
			}
		}

		/// <summary>
		/// Event handler for Kinect sensor's DepthFrameReady event
		/// </summary>
		/// <param name="sender">object sending the event</param>
		/// <param name="e">event arguments</param>
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
					//for (int i = 0; i < 10; ++i)
					{
						// Get the depth for this pixel
						short depth = depthPixels[i].Depth;
						
						// To convert to a byte, we're discarding the most-significant
						// rather than least-significant bits.
						// We're preserving detail, although the intensity will "wrap."
						// Values outside the reliable depth range are mapped to 0 (black).

						// Note: Using conditionals in this loop could degrade performance.
						// Consider using a lookup table instead when writing production code.
						// See the KinectDepthViewer class used by the KinectExplorer sample
						// for a lookup table example.
						byte intensity = (byte)(depth >= minDepth && depth <= maxDepth ? depth : 0);

						TransferData.depth[i] = intensity;
					}
				}
			}
		}


        public static void OnConnect(UserContext aContext)
        {
            Console.WriteLine("Client Connected From : " + aContext.ClientAddress.ToString());
            // Create a new Connection Object to save client context information
            var conn = new Connection { Context = aContext };

            // Add a connection Object to thread-safe collection
            OnlineConnections.TryAdd(aContext.ClientAddress.ToString(), conn);
        }


        public static void OnReceive(UserContext aContext)
        {
            try
            {
                Console.WriteLine("Data Received From [" + aContext.ClientAddress.ToString() + "] - " + aContext.DataFrame.ToString());

            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message.ToString());
            }
        }


        public static void OnSend(UserContext aContext)
        {
            Console.WriteLine("Data Sent To : " + aContext.ClientAddress.ToString());
        }


        public static void OnDisconnect(UserContext aContext)
        {
            Console.WriteLine("Client Disconnected : " + aContext.ClientAddress.ToString());

            // Remove the connection Object from the thread-safe collection
            Connection conn;
            OnlineConnections.TryRemove(aContext.ClientAddress.ToString(), out conn);

            // Dispose timer to stop sending messages to the client.
            conn.timer.Dispose();
        }
    }

	public class TransferData
	{
		public static byte[] depth;
	}

    public class Connection
    {
        public System.Threading.Timer timer;
        public UserContext Context { get; set; }
        
		
		public Connection()
        {
            this.timer = new System.Threading.Timer(this.TimerCallback, null, 0, 1000);
        }


        private void TimerCallback(object state)
        {
            try
            {
                // Sending Data to the Client
                //Context.Send("[" + Context.ClientAddress.ToString() + "] " + System.DateTime.Now.ToString());
				Context.Send(TransferData.depth);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
            }

        }
    }

}