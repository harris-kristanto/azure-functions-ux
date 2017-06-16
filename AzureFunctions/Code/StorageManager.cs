using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using AzureFunctions.Common;
using AzureFunctions.Contracts;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Blob;
using Newtonsoft.Json;

namespace AzureFunctions.Code
{
    public class StorageManager : IStorageManager
    {
        private static readonly CloudStorageAccount _storageAccount;
        private static readonly CloudBlobClient _blobClient;

        static StorageManager()
        {
            if (!string.IsNullOrEmpty(StaticSettings.UxStorage))
            {
                _storageAccount = CloudStorageAccount.Parse(StaticSettings.UxStorage);
                _blobClient = _storageAccount.CreateCloudBlobClient();
            }
        }

        public async Task<T> GetObject<T>(string id) where T : new()
        {
            id = id?.ToLower();
            (var result, _) = await InternalGetObject<T>(id);
            return result;
        }

        public async Task<M> UpdateObject<T, M>(string id, Func<T, M> process) where T : new()
        {
            id = id?.ToLower();
            (var item, var blob) = await InternalGetObject<T>(id);
            var blobExists = await blob.ExistsAsync();
            var etag = string.Empty;

            if (blobExists)
            {
                await blob.FetchAttributesAsync();
                etag = blob.Properties.ETag;
            }

            var result = process(item);

            var value = JsonConvert.SerializeObject(item);

            if (blobExists)
            {
                await blob.UploadTextAsync(value, Encoding.UTF8, AccessCondition.GenerateIfMatchCondition(etag), null, null);
            }
            else
            {
                await blob.UploadTextAsync(value);
            }

            return result;
        }

        private async Task<(T, CloudBlockBlob)> InternalGetObject<T>(string id) where T : new()
        {
            var container = _blobClient.GetContainerReference(typeof(T).Name.ToLower());
            await container.CreateIfNotExistsAsync();
            var blob = container.GetBlockBlobReference(id);
            if (await blob.ExistsAsync())
            {
                using (var stream = await blob.OpenReadAsync())
                using (var reader = new StreamReader(stream))
                {
                    return (JsonConvert.DeserializeObject<T>(await reader.ReadToEndAsync()), blob);
                }
            }
            return (new T(), blob);
        }

        public Task<bool> VerifyOwnership(string armId)
        {
            return Task.FromResult(true);
        }
    }
}