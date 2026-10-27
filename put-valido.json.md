[ --> É uma lista por conta disso tem os colchetes com um evento 
  { 
    "Source": "com.empresa.warehouse", --> Quem está enviando. Funciona como o remetente.
    "DetailType": "PackageReceived", --> O tipo de aviso (“pacote recebido”).
    "Detail": "{\"packageId\":\"PKG-1001\",\"customerId\":\"CUST-500\",\"warehouseId\":\"WH-01\",\"items\":[{\"sku\":\"SKU-123\",\"quantity\":2},{\"sku\":\"SKU-456\",\"quantity\":1}],\"status\":\"NEW\"}" --> Os dados do pacote, escritos como texto
  }
]

O Source e o DetailType são o que o EventBridge usa para decidir o destino, e o Detail é o conteúdo que a Lambda vai ler.