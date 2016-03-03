﻿using Newtonsoft.Json;

namespace AzureFunctions.Models.ArmResources
{
    public class Subscription
    {
        [JsonProperty(PropertyName = "subscriptionId")]
        public string SubscriptionId { get; private set; }

        public ResourceGroup FunctionsResourceGroup { get; set; }

        [JsonProperty(PropertyName = "displayName")]
        public string DisplayName { get; private set; }

        public Subscription(string subscriptionId, string displayName)
        {
            this.SubscriptionId = subscriptionId;
            this.DisplayName = displayName;
        }
    }
}