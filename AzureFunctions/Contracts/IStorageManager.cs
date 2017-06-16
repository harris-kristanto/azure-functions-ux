using System;
using System.Threading.Tasks;

namespace AzureFunctions.Contracts
{
    public interface IStorageManager
    {
        Task<bool> VerifyOwnership(string armId);
        Task<T> GetObject<T>(string id) where T : new();
        Task<M> UpdateObject<T, M>(string id, Func<T, M> process) where T : new();
    }
}
