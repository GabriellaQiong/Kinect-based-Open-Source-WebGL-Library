using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Alchemy;
using Alchemy.Classes;
using System.Collections.Concurrent;
using System.Threading;


namespace AlchemyWebSocketServer
{
    class Program
    {
        //Thread-safe collection of Online Connections.
        protected static ConcurrentDictionary<string, Connection> OnlineConnections = new ConcurrentDictionary<string, Connection>();
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


            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.Title = "Alchemy WebSocket Server";
            Console.WriteLine("Running Alchemy WebSocket Server ...");
            Console.WriteLine("[Type \"exit\" and hit enter to stop the server]");


            // Accept commands on the console and keep it alive
            var command = string.Empty;
            while (command != "exit")
            {
                command = Console.ReadLine();
            }

            aServer.Stop();

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
                Context.Send("[" + Context.ClientAddress.ToString() + "] " + System.DateTime.Now.ToString());
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
            }

        }

    }

}