# 🔗 API Integration

### Search Endpoint
```
GET https://cmto.ca.thentiacloud.net/rest/public/profile/search/
```

### Profile Details Endpoint
```
GET https://cmto.ca.thentiacloud.net/rest/public/profile/get/?id={profileId}
```

- Responses are in JSON format
- Parsed using Retrofit + Gson

See `CMTOService.kt` and `RetrofitClient.kt` for details.
