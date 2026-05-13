/**
 * DHL Express API Types
 * Based on DHL Express API 3.2.2 specification
 */

export interface DHLAddress {
  postalCode: string
  cityName: string
  countryCode: string
  provinceCode?: string
  addressLine1?: string
  addressLine2?: string
  addressLine3?: string
  countyName?: string
}

export interface DHLContact {
  fullName: string
  companyName: string
  phone: string
  email?: string
}

export interface DHLPackage {
  weight: number
  dimensions: {
    length: number
    width: number
    height: number
  }
  customerReferences?: string
  description?: string
}

export interface DHLRateRequest {
  customerDetails: {
    shipperDetails: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
    receiverDetails: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
  }
  accounts: Array<{
    typeCode: 'shipper' | 'receiver'
    number: string
  }>
  productCode?: string
  localProductCode?: string
  valueAddedServices?: Array<{
    serviceCode: string
    value?: number
    currency?: string
  }>
  productsAndServices?: Array<{
    productCode: string
    localProductCode?: string
  }>
  payerCountryCode?: string
  plannedShippingDateAndTime: string
  unitOfMeasurement: 'metric' | 'imperial'
  isCustomsDeclarable: boolean
  monetaryAmount?: Array<{
    typeCode: string
    value: number
    currency: string
  }>
  requestAllValueAddedServices?: boolean
  returnStandardProductsOnly?: boolean
  nextBusinessDay?: boolean
  productTypeCode?: 'all' | 'ownAccount' | 'creditAccount'
  packages: DHLPackage[]
}

export interface DHLRateResponse {
  products: Array<{
    productName: string
    productCode: string
    localProductCode: string
    localProductCountryCode: string
    networkTypeCode: string
    isCustomerAgreement: boolean
    weight: {
      volumetric: number
      provided: number
      unitOfMeasurement: string
    }
    totalPrice: Array<{
      price: number
      priceCurrency: string
      priceBreakdown?: Array<{
        typeCode: string
        price: number
        priceBreakdown?: Array<{
          typeCode: string
          price: number
        }>
      }>
    }>
    totalPriceBreakdown?: Array<{
      currencyType: string
      priceCurrency: string
      priceBreakdown: Array<{
        typeCode: string
        price: number
      }>
    }>
    detailedPriceBreakdown?: Array<{
      breakdown: Array<{
        name: string
        serviceCode: string
        localServiceCode: string
        typeCode: string
        serviceTypeCode: string
        price: number
        priceCurrency: string
        isCustomerAgreement: boolean
        isMarketedService: boolean
        isBillingServiceIndicator: boolean
        priceBreakdown: Array<{
          priceType: string
          typeCode: string
          price: number
          rate: number
          basePrice: number
        }>
        tariffRateFormula: string
      }>
    }>
    pickupCapabilities: {
      nextBusinessDay: boolean
      localCutoffDateAndTime: string
      GMTCutoffTime: string
      pickupEarliest: string
      pickupLatest: string
      originServiceAreaCode: string
      originFacilityAreaCode: string
      pickupAdditionalDays: number
      pickupDayOfWeek: number
    }
    deliveryCapabilities: {
      deliveryTypeCode: string
      estimatedDeliveryDateAndTime: string
      destinationServiceAreaCode: string
      destinationFacilityAreaCode: string
      deliveryAdditionalDays: number
      deliveryDayOfWeek: number
      totalTransitDays: number
    }
    items?: Array<{
      number: number
      breakdown: Array<{
        name: string
        serviceCode: string
        localServiceCode: string
        typeCode: string
        serviceTypeCode: string
        price: number
        priceCurrency: string
        isCustomerAgreement: boolean
        isMarketedService: boolean
        isBillingServiceIndicator: boolean
        priceBreakdown: Array<{
          priceType: string
          typeCode: string
          price: number
          rate: number
          basePrice: number
        }>
        tariffRateFormula: string
      }>
    }>
    pricingDate: string
  }>
  exchangeRates?: Array<{
    currentExchangeRate: number
    currency: string
    baseCurrency: string
  }>
  warnings?: string[]
}

export interface DHLShipmentRequest {
  plannedShippingDateAndTime: string
  pickup: {
    isRequested: boolean
    closeTime?: string
    location?: string
    specialInstructions?: Array<{
      value: string
      typeCode?: string
    }>
    remark?: string
  }
  productCode: string
  localProductCode?: string
  getRateEstimates?: boolean
  accounts: Array<{
    typeCode: 'shipper' | 'receiver'
    number: string
  }>
  valueAddedServices?: Array<{
    serviceCode: string
    value?: number
    currency?: string
    method?: string
  }>
  outputImageProperties?: {
    printerDPI?: number
    encodingFormat?: string
    imageOptions?: Array<{
      typeCode: string
      templateName?: string
      isRequested: boolean
      invoiceType?: string
      languageCode?: string
      languageCountryCode?: string
    }>
    splitTransportAndWaybillDocLabels?: boolean
    allDocumentsInOneImage?: boolean
    splitDocumentsByPages?: boolean
    splitInvoiceAndReceipt?: boolean
    receiptAndLabelsInOneImage?: boolean
  }
  customerDetails: {
    shipperDetails: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
      typeCode?: 'business' | 'direct_consumer' | 'government' | 'other' | 'private'
    }
    receiverDetails: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
      typeCode?: 'business' | 'direct_consumer' | 'government' | 'other' | 'private'
    }
    buyerDetails?: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
    importerDetails?: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
    exporterDetails?: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
    sellerDetails?: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
    payerDetails?: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
    ultimateConsigneeDetails?: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
  }
  content: {
    packages: Array<{
      typeCode?: string
      weight: number
      dimensions: {
        length: number
        width: number
        height: number
      }
      customerReferences?: Array<{
        value: string
        typeCode: string
      }>
      identifiers?: Array<{
        typeCode: string
        value: string
        dataIdentifier?: string
      }>
      description?: string
      labelBarcodes?: Array<{
        position: string
        symbologyCode: string
        content: string
        textBelowBarcode?: string
      }>
      labelText?: Array<{
        position: string
        caption: string
        value: string
      }>
    }>
    isCustomsDeclarable: boolean
    declaredValue?: number
    declaredValueCurrency?: string
    exportDeclaration?: {
      lineItems: Array<{
        number: number
        description: string
        price: number
        quantity: {
          value: number
          unitOfMeasurement: string
        }
        commodityCodes?: Array<{
          typeCode: string
          value: string
        }>
        exportReasonType?: string
        manufacturerCountry: string
        weight: {
          netValue: number
          grossValue: number
        }
        isTaxesPaid?: boolean
        additionalInformation?: string[]
        customerReferences?: Array<{
          typeCode: string
          value: string
        }>
        customsDocuments?: Array<{
          typeCode: string
          value: string
        }>
      }>
      invoice?: {
        number: string
        date: string
        signatureName?: string
        signatureTitle?: string
        signatureImage?: string
        instructions?: string[]
        customerDataTextEntries?: Array<{
          position: string
          caption: string
          value: string
        }>
      }
      remarks?: Array<{
        value: string
      }>
      additionalCharges?: Array<{
        value: number
        caption: string
        typeCode: string
      }>
      destinationPortName?: string
      placeOfIncoterm?: string
      payerVATNumber?: string
      recipientReference?: string
      exporter?: {
        id: string
        code: string
      }
      packageMarks?: string
      declarationNotes?: Array<{
        value: string
      }>
      exportReference?: string
      exportReason?: string
      exportReasonType?: string
      shipmentType?: string
      customsDocuments?: Array<{
        typeCode: string
        value: string
      }>
    }
    description: string
    USFilingTypeValue?: string
    incoterm?: string
    unitOfMeasurement: 'metric' | 'imperial'
  }
  documentImages?: Array<{
    typeCode: string
    imageFormat: string
    content: string
  }>
  onDemandDelivery?: {
    deliveryOption: string
    location?: string
    specialInstructions?: string
    gateCode?: string
    whereToLeave?: string
    neighbourName?: string
    neighbourHouseNumber?: string
    authorizerName?: string
    servicePointId?: string
    requestedDeliveryDate?: string
  }
  requestOndemandDeliveryURL?: boolean
  shipmentNotification?: Array<{
    typeCode: string
    receiverId: string
    languageCode?: string
    languageCountryCode?: string
    bespokeMessage?: string
  }>
  prepaidCharges?: Array<{
    typeCode: string
    currency: string
    value: number
    method: string
  }>
  getTransliteratedResponse?: boolean
  estimatedDeliveryDate?: {
    isRequested: boolean
    typeCode: string
  }
  getAdditionalInformation?: Array<{
    typeCode: string
    isRequested: boolean
  }>
  parentShipment?: {
    productCode: string
    packagesCount: number
  }
}

export interface DHLShipmentResponse {
  shipmentTrackingNumber: string
  cancelPickupUrl?: string
  trackingUrl?: string
  dispatchConfirmationNumbers?: string[]
  packages: Array<{
    referenceNumber: number
    trackingNumber: string
    trackingUrl?: string
    volumetricWeight?: number
  }>
  documents?: Array<{
    imageFormat: string
    content: string
    typeCode?: string
  }>
  onDemandDeliveryURL?: string
  shipmentDetails?: Array<{
    serviceHandlingFeatureCodes?: string[]
    volumetricWeight?: number
    billingCode?: string
    serviceContentCode?: string
    customerDetails?: {
      shipperDetails?: {
        postalAddress?: DHLAddress
        contactInformation?: DHLContact
      }
      receiverDetails?: {
        postalAddress?: DHLAddress
        contactInformation?: DHLContact
      }
    }
    originServiceArea?: {
      facilityCode?: string
      serviceAreaCode?: string
      outboundSortCode?: string
    }
    destinationServiceArea?: {
      facilityCode?: string
      serviceAreaCode?: string
      inboundSortCode?: string
    }
    dhlRoutingCode?: string
    dhlRoutingDataId?: string
    deliveryDateCode?: string
    deliveryTimeCode?: string
    productShortName?: string
    valueAddedServices?: Array<{
      serviceCode?: string
      localServiceCode?: string
      value?: number
      currency?: string
      method?: string
    }>
    pickupDetails?: {
      localCutoffDateAndTime?: string
      gmtCutoffTime?: string
      cutoffTimeOffset?: string
      pickupEarliest?: string
      pickupLatest?: string
      totalTransitDays?: string
      pickupAdditionalDays?: string
      deliveryAdditionalDays?: string
      pickupDayOfWeek?: string
      deliveryDayOfWeek?: string
    }
  }>
  shipmentCharges?: Array<{
    currencyType?: string
    priceCurrency?: string
    priceBreakdown?: Array<{
      typeCode?: string
      price?: number
      priceBreakdown?: Array<{
        typeCode?: string
        price?: number
      }>
    }>
  }>
  barcodeInfo?: {
    shipmentIdentificationNumberBarcodeContent?: string
    originDestinationServiceTypeBarcodeContent?: string
    routingBarcodeContent?: string
    trackingNumberBarcodes?: Array<{
      referenceNumber?: number
      trackingNumberBarcodeContent?: string
    }>
  }
  estimatedDeliveryDate?: {
    estimatedDeliveryDate?: string
    estimatedDeliveryType?: string
  }
  warnings?: string[]
}

export interface DHLTrackingRequest {
  trackingNumber: string
  shipmentTrackingNumber?: string
  pieceTrackingNumber?: string
  shipmentReference?: string
  shipmentReferenceType?: 'CU' | 'DD' | 'PU' | 'SH'
  shipperAccountNumber?: string
  dateRangeFrom?: string
  dateRangeTo?: string
  trackingView?: 'all-checkpoints' | 'last-checkpoint' | 'shipment-details-only'
  levelOfDetail?: 'all' | 'shipment' | 'piece'
}

export interface DHLTrackingResponse {
  shipments: Array<{
    shipmentTrackingNumber: string
    status: string
    shipmentTimestamp: string
    productCode: string
    description: string
    shipperDetails: {
      name: string
      postalAddress: DHLAddress
      serviceArea?: Array<{
        code: string
        description: string
      }>
      accountNumber?: string
    }
    receiverDetails: {
      name: string
      postalAddress: DHLAddress
      serviceArea?: Array<{
        code: string
        description: string
      }>
    }
    totalWeight: number
    unitOfMeasurements: string
    numberOfPieces: number
    pieces?: Array<{
      number: number
      typeCode: string
      shipmentTrackingNumber: string
      trackingNumber: string
      description: string
      weight: number
      dimensionalWeight: number
      actualWeight: number
      dimensions: {
        length: number
        width: number
        height: number
      }
      actualDimensions?: {
        length: number
        width: number
        height: number
      }
      unitOfMeasurements: string
      shipperReferences?: Array<{
        value: string
        typeCode: string
      }>
      events?: Array<{
        date: string
        time: string
        typeCode: string
        description: string
        serviceArea?: Array<{
          code: string
          description: string
        }>
        signedBy?: string
      }>
    }>
    events?: Array<{
      date: string
      time: string
      typeCode: string
      description: string
      serviceArea?: Array<{
        code: string
        description: string
      }>
      signedBy?: string
    }>
    estimatedDeliveryDate?: string
    childrenShipmentIdentificationNumbers?: string[]
  }>
}

export interface DHLPickupRequest {
  plannedPickupDateAndTime: string
  closeTime: string
  location: string
  locationType?: 'business' | 'residence'
  accounts: Array<{
    typeCode: 'shipper'
    number: string
  }>
  specialInstructions?: Array<{
    value: string
    typeCode?: string
  }>
  remark?: string
  customerDetails: {
    shipperDetails: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
    receiverDetails: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
    bookingRequestorDetails: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
    pickupDetails: {
      postalAddress: DHLAddress
      contactInformation: DHLContact
    }
  }
  shipmentDetails: Array<{
    productCode: string
    localProductCode?: string
    accounts: Array<{
      typeCode: 'shipper'
      number: string
    }>
    valueAddedServices?: Array<{
      serviceCode: string
    }>
    isCustomsDeclarable: boolean
    unitOfMeasurement: 'metric' | 'imperial'
    packages: Array<{
      weight: number
      dimensions: {
        length: number
        width: number
        height: number
      }
    }>
  }>
}

export interface DHLPickupResponse {
  dispatchConfirmationNumbers: string[]
  readyByTime?: string
  nextPickupDate?: string
  warnings?: string[]
}

export interface DHLError {
  instance?: string
  detail?: string
  title: string
  message: string
  status: string
  code?: string
  additionalDetails?: Array<{
    value: string
    typeCode?: string
  }>
}
