   {
     "source": ["com.empresa.warehouse"],
     "detail-type": ["PackageReceived"]
   }

   Ele diz ao EventBridge quais eventos a regra deve capturar
   Os valores ficam entre colchetes porque cada campo aceita uma lista de valores possíveis. Basta o evento ter um deles. Aqui cada lista tem um só.
Os dois campos funcionam em conjunto: o evento precisa bater no source e no detail-type.