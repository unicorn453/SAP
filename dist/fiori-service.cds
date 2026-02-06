using ShipmentService from '../../srv/shipment-service';

// Annotations for Fiori Elements UI
annotate ShipmentService.ShipmentDocuments with @(
    UI: {
        HeaderInfo: {
            TypeName: 'Shipment Document',
            TypeNamePlural: 'Shipment Documents',
            Title: { Value: shipmentNumber },
            Description: { Value: supplierName }
        },
        SelectionFields: [
            shipmentNumber,
            supplierName,
            status,
            shipmentDate
        ],
        LineItem: [
            { Value: shipmentNumber, Label: 'Shipment Number' },
            { Value: supplierName, Label: 'Supplier' },
            { Value: supplierEmail, Label: 'Email' },
            { Value: shipmentDate, Label: 'Ship Date' },
            { Value: totalItems, Label: 'Total Items' },
            { Value: totalQuantity, Label: 'Total Quantity' },
            { Value: status, Label: 'Status' },
            { Value: createdAt, Label: 'Uploaded At' }
        ],
        Facets: [
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'Shipment Details',
                Target: '@UI.FieldGroup#ShipmentDetails'
            },
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'Supplier Information',
                Target: '@UI.FieldGroup#SupplierInfo'
            },
            {
                $Type: 'UI.ReferenceFacet',
                Label: 'Items',
                Target: 'items/@UI.LineItem'
            }
        ],
        FieldGroup#ShipmentDetails: {
            Data: [
                { Value: shipmentNumber },
                { Value: shipmentDate },
                { Value: expectedDeliveryDate },
                { Value: documentName },
                { Value: status },
                { Value: downloadedAt }
            ]
        },
        FieldGroup#SupplierInfo: {
            Data: [
                { Value: supplierName },
                { Value: supplierEmail },
                { Value: supplierPhone }
            ]
        }
    }
);

// Annotations for Shipment Items
annotate ShipmentService.ShipmentItems with @(
    UI: {
        HeaderInfo: {
            TypeName: 'Shipment Item',
            TypeNamePlural: 'Shipment Items',
            Title: { Value: itemNumber }
        },
        LineItem: [
            { Value: itemNumber, Label: 'Item Number' },
            { Value: itemDescription, Label: 'Description' },
            { Value: quantity, Label: 'Quantity' },
            { Value: unit, Label: 'Unit' },
            { Value: value, Label: 'Value' },
            { Value: currency_code, Label: 'Currency' }
        ]
    }
);

// Add labels
annotate ShipmentService.ShipmentDocuments with {
    ID @title: 'ID';
    shipmentNumber @title: 'Shipment Number';
    supplierName @title: 'Supplier Name';
    supplierEmail @title: 'Supplier Email';
    supplierPhone @title: 'Supplier Phone';
    shipmentDate @title: 'Shipment Date';
    expectedDeliveryDate @title: 'Expected Delivery';
    totalItems @title: 'Total Items';
    totalQuantity @title: 'Total Quantity';
    documentName @title: 'Document Name';
    status @title: 'Status';
    downloadedAt @title: 'Downloaded At';
    createdAt @title: 'Created At';
};

annotate ShipmentService.ShipmentItems with {
    itemNumber @title: 'Item Number';
    itemDescription @title: 'Description';
    quantity @title: 'Quantity';
    unit @title: 'Unit';
    value @title: 'Value';
    currency_code @title: 'Currency';
};