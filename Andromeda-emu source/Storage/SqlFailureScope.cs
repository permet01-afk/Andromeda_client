using System;
using System.Threading;

namespace OrbitReborn_Emulator.Storage
{
    /// <summary>
    /// Observes failures swallowed by synchronous reward helpers. This is not a
    /// transaction or a durable receipt, and it does not roll back earlier writes.
    /// Never carry a scope across await, task dispatch or another thread.
    /// </summary>
    public sealed class SqlFailureScope : IDisposable
    {
        [ThreadStatic]
        private static SqlFailureScope current;

        private readonly SqlFailureScope parent;
        private readonly int threadId;
        private Exception firstFailure;
        private string firstOperation;
        private bool disposed;

        private SqlFailureScope()
        {
            parent = current;
            threadId = Thread.CurrentThread.ManagedThreadId;
            current = this;
        }

        public static SqlFailureScope Begin()
        {
            return new SqlFailureScope();
        }

        /// <summary>
        /// Records an error without throwing. Returns false outside a scope, so
        /// callers can preserve legacy behavior there. Record labels, never SQL,
        /// connection strings, credentials, parameters or tickets.
        /// </summary>
        public static bool Record(Exception error, string operation = null)
        {
            if (current == null) return false;
            if (error == null) throw new ArgumentNullException("error");
            for (SqlFailureScope scope = current; scope != null; scope = scope.parent)
            {
                if (scope.firstFailure != null) continue;
                scope.firstFailure = error;
                scope.firstOperation = operation;
            }
            return true;
        }

        public static void ThrowIfCurrentFailed()
        {
            if (current != null) current.ThrowIfFailed();
        }

        public void ThrowIfFailed()
        {
            AssertCurrentThread();
            if (disposed) throw new ObjectDisposedException("SqlFailureScope");
            if (firstFailure != null)
                throw new InvalidOperationException(
                    "Reward persistence failure was observed" +
                    (string.IsNullOrEmpty(firstOperation) ? "." : " at " + firstOperation + "."),
                    firstFailure);
        }

        private void AssertCurrentThread()
        {
            if (Thread.CurrentThread.ManagedThreadId != threadId)
                throw new InvalidOperationException("SqlFailureScope must remain on its creating thread.");
        }

        public void Dispose()
        {
            AssertCurrentThread();
            if (disposed) return;
            if (!object.ReferenceEquals(current, this))
                throw new InvalidOperationException("SqlFailureScope must be disposed in reverse creation order.");
            current = parent;
            disposed = true;
        }
    }
}
