using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using AzureFunctions.Contracts;
using AzureFunctions.Models;

namespace AzureFunctions.Controllers
{
    public class UxSettingsController : ApiController
    {
        private readonly IStorageManager _storageManager;

        public UxSettingsController(IStorageManager storageManager)
        {
            _storageManager = storageManager;
        }

        [HttpGet]
        public async Task<HttpResponseMessage> GetUxSettings(string id)
        {
            await VerifyOwnership(id);
            return Request.CreateResponse(HttpStatusCode.OK, await _storageManager.GetObject<UxSettings>(id));
        }

        [HttpPut]
        public async Task<HttpResponseMessage> AddOrUpdateGraph(string id, Query query)
        {
            await VerifyOwnership(id);
            query = await _storageManager.UpdateObject<UxSettings, Query>(id, s =>
            {
                var existingQuery = s.Graphs.FirstOrDefault(q => q.Id == query.Id);
                if (query.Id == null || existingQuery == null)
                {
                    var newQuery = new Query(query.Value);
                    s.Graphs = s.Graphs.Concat(new[] { newQuery });
                    return newQuery;
                }
                else
                {
                    existingQuery.Value = query.Value;
                    existingQuery.ModifiedTime = DateTimeOffset.UtcNow;
                    return existingQuery;
                }
            });
            return Request.CreateResponse(HttpStatusCode.OK, query);
        }

        [HttpDelete]
        public async Task<HttpResponseMessage> DeleteGraph(string id, Guid queryId)
        {
            await VerifyOwnership(id);
            await _storageManager.UpdateObject<UxSettings, Query>(id, s =>
            {
                s.Graphs = s.Graphs.Where(q => q.Id != queryId);
                return null;
            });
            return new HttpResponseMessage(HttpStatusCode.NoContent);
        }

        private async Task VerifyOwnership(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                throw new HttpResponseException(Request.CreateResponse(HttpStatusCode.BadRequest, new { error = $"id ({id}) can't be null or empty." }));
            }

            // id looks like:
            // /subscriptions/00000000-0000-4000-0000-000000000000/resourceGroups/<resourceGroupName>/providers/Microsoft.Web/sites/<appName>
            // /subscriptions/00000000-0000-4000-0000-000000000000/resourceGroups/<resourceGroupName>/providers/Microsoft.Web/sites/<appName>/functions/<functionName>
            // /subscriptions/00000000-0000-4000-0000-000000000000/resourceGroups/<resourceGroupName>/providers/Microsoft.Web/sites/<appName>/slots/<slotName>
            // /subscriptions/00000000-0000-4000-0000-000000000000/resourceGroups/<resourceGroupName>/providers/Microsoft.Web/sites/<appName>/slots/<slotName>/functions/<functionName>
            string functionIdToArmId(string appId)
            {
                const int appSegments = 8;
                const int slotSegments = 10;

                var parts = id.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
                var isSlot = id.IndexOf("/slots/", StringComparison.OrdinalIgnoreCase) != -1;

                return string.Join("/", parts.Take(isSlot ? slotSegments : appSegments).ToArray());
            }

            var armId = id.IndexOf("/functions/", StringComparison.OrdinalIgnoreCase) != -1
                ? functionIdToArmId(id)
                : id;

            if (!await _storageManager.VerifyOwnership(armId))
            {
                throw new HttpResponseException(Request.CreateResponse(HttpStatusCode.Forbidden, new { error = $"User doesn't have access on path" }));
            }
        }
    }
}