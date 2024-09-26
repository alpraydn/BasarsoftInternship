var markersMap = new Map(); 

var vectorSource = new ol.source.Vector();

var polygonSource = new ol.source.Vector(); 

var lineStringSource = new ol.source.Vector(); 

var extent = ol.proj.transformExtent(
    [23.0, 33.0, 47.0, 44.0], // [minX, minY, maxX, maxY]
    'EPSG:4326', // Koordinat sistemi
    'EPSG:3857'  // Hedef projeksiyon
);

var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([35.2433, 38.9637]), // Türkiye'nin merkezi
        zoom: 6.5,
        minZoom: 6.2,
        extent: extent 
    })
});

map.getView().on('change:resolution', function() {
    var zoom = map.getView().getZoom();
    if (zoom < 6.2) {
        map.getView().setZoom(6.2);
    }
});

map.on('moveend', function() {
    var view = map.getView();
    var currentExtent = view.calculateExtent(map.getSize());
    if (!ol.extent.containsExtent(extent, currentExtent)) {
        var newCenter = [
            Math.max(extent[0], Math.min(extent[2], view.getCenter()[0])),
            Math.max(extent[1], Math.min(extent[3], view.getCenter()[1]))
        ];
        view.setCenter(newCenter);
    }
});

var markerVectorLayer; 

function loadMarkers() {
    fetch('http://localhost:5179/api/points')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Markers data fetched:', data); 

            data.value.forEach(item => {
                var format = new ol.format.WKT();
                var feature = format.readFeature(item.wkt, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                });

                feature.setId(item.id); 
                feature.set('name', item.name); 

                vectorSource.addFeature(feature);

                markersMap.set(item.id, feature); 

                console.log('Marker eklendi:', feature, item.id);

            });

            markerVectorLayer = new ol.layer.Vector({
                source: vectorSource,
                style: new ol.style.Style({
                    image: new ol.style.Icon({
                        anchor: [0.5, 1],
                        src: './images/icon.png',
                        scale: 0.6
                    })
                })
            });

            map.addLayer(markerVectorLayer);
        })
        .catch(error => {
            console.error('Error fetching markers data:', error);
        });
}


var polygonVectorLayer; 

function loadPolygons() {
    fetch('http://localhost:5179/api/points')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Polygons data fetched:', data); 

            data.value.forEach(item => {
                // WKT formatındaki geometriden OpenLayers geometrisine dönüştürme
                var format = new ol.format.WKT();
                var feature = format.readFeature(item.wkt, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                });

                if (feature.getGeometry().getType() === 'Polygon') {
                    if (!polygonSource.getFeatureById(item.id)) {
                        feature.setId(item.id); 
                        feature.set('name', item.name);
                        polygonSource.addFeature(feature);
                        markersMap.set(item.id, feature); 
                        console.log('Polygon eklendi:', feature, item.id);
                    }
                }
            });

            if (!polygonVectorLayer) {
                polygonVectorLayer = new ol.layer.Vector({
                    source: polygonSource,
                    style: new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'blue',
                            width: 2
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(0, 0, 255, 0.2)' 
                        })
                    })
                });
                map.addLayer(polygonVectorLayer);
            }
        })
        .catch(error => {
            console.error('Error fetching polygons data:', error);
        });
}


var lineStringVectorLayer; 

function loadLineStrings() {
    fetch('http://localhost:5179/api/points')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('LineString data fetched:', data); 

            data.value.forEach(item => {
                var format = new ol.format.WKT();
                var feature = format.readFeature(item.wkt, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                });

                if (feature.getGeometry().getType() === 'LineString') {
                    if (!lineStringSource.getFeatureById(item.id)) {
                        feature.setId(item.id); 
                        feature.set('name', item.name);
                        lineStringSource.addFeature(feature);
                        markersMap.set(item.id, feature); 
                        console.log('LineString eklendi:', feature, item.id);
                    }
                }
            });

            if (!lineStringVectorLayer) {
                lineStringVectorLayer = new ol.layer.Vector({
                    source: lineStringSource,
                    style: new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'blue', 
                            width: 2
                        })
                    })
                });
                map.addLayer(lineStringVectorLayer);
            }
        })
        .catch(error => {
            console.error('Error fetching LineStrings data:', error);
        });
}

var isAddingPolygon = false;  
var isAddingPoint = false;    
var isAddingLineString = false; 

// OpenLayers Popup Element ve Popup Bağlayıcıları
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

if (!container || !content || !closer) {
    console.error('Popup element not found in the DOM');
} else {
    // OpenLayers Overlay (Popup)
    var overlay = new ol.Overlay({
        element: container,
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    });

    map.addOverlay(overlay);

    closer.onclick = function () {
        overlay.setPosition(undefined);
        closer.blur();
        return false;
    };

var isDrawing = false; 

map.on('singleclick', function (evt) {
    if (isAddingPoint || isAddingPolygon || isAddingLineString) {
        console.log("Popup açılmıyor çünkü ekleme modundayız.");
        return;
    }

    var feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        return feature;
    });

    if (feature) {
        var geometryType = feature.getGeometry().getType();
        var coordinates;
        
        if (geometryType === 'Point') {
            coordinates = feature.getGeometry().getCoordinates();
        } else if (geometryType === 'Polygon') {
            coordinates = feature.getGeometry().getInteriorPoint().getCoordinates();
        } else if (geometryType === 'LineString') {
            coordinates = feature.getGeometry().getCoordinateAt(0.5); 
        }

        var name = feature.get('name');
        var id = feature.getId(); 

        console.log(`Popup açılıyor. Marker ID: ${id}, Geometry Type: ${geometryType}`); 

        content.innerHTML = `<p><strong>${name}</strong></p>
                            <button id="manualUpdateBtn">Manual Update</button>
                            <button id="panelUpdateBtn">Panel Update</button>
                            <button id="deleteBtn">Delete</button>`;

        overlay.setPosition(coordinates);

        document.getElementById('manualUpdateBtn').addEventListener('click', function () {
            openManualUpdate(id);
            overlay.setPosition(undefined); 
        });

        document.getElementById('panelUpdateBtn').addEventListener('click', function () {
            openPanelUpdate(id);
            overlay.setPosition(undefined); 
        });

        document.getElementById('deleteBtn').addEventListener('click', function () {
            deleteMarker(id); 
            overlay.setPosition(undefined); 
        });
    } else {
        overlay.setPosition(undefined); 
    }
});
}


function openManualUpdate(id) {
    var marker = markersMap.get(parseInt(id));
    
    if (marker) {
        console.log('Manual Update başlatıldı. Marker ID:', id);

        jsPanel.getPanels().forEach(panel => {
            panel.close();
            console.log('Tüm paneller kapatıldı.');
        });
      
        // Geometrinin eski WKT formatındaki halini kaydet
        var format = new ol.format.WKT();
        var oldWKT = format.writeGeometry(marker.getGeometry(), {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        });

        // Marker'ın eski konumunu kaydet
        var oldCoordinates = marker.getGeometry().getCoordinates();
        var oldLonLatCoords = ol.proj.toLonLat(oldCoordinates);

        var modifyInteraction = new ol.interaction.Modify({
            features: new ol.Collection([marker]),
            pixelTolerance: 10, // Taşıma hassasiyeti
        });

        map.addInteraction(modifyInteraction); 
        console.log('Modify Interaction eklendi, marker taşınabilir.');

        modifyInteraction.on('modifystart', function () {
            console.log('Marker taşımaya başladı.');
        });

        modifyInteraction.on('modifyend', function (event) {
            var newCoordinates = marker.getGeometry().getCoordinates(); 
            var format = new ol.format.WKT();
            var wkt = format.writeGeometry(marker.getGeometry(), {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            });     

            console.log('Yeni WKT koordinatları:', wkt);

            jsPanel.create({
                headerTitle: 'Confirm Update',
                content: `
                    <p>Do you want to update the coordinates?</p>
                    <button id="confirmUpdateBtn">Update</button>
                    <button id="cancelUpdateBtn">Cancel</button>
                `,
                panelSize: { width: '300px', height: '150px' },
                position: {
                    my: 'center-top',
                    at: 'center-top',
                    offsetY: 75  
                },
                headerControls: {
                    minimize: 'remove', 
                    maximize: 'remove',  
                    smallify: 'remove'
                },

                callback: function(panel) {
                    document.getElementById('confirmUpdateBtn').addEventListener('click', function() {
                        var updatedData = {
                            wkt: wkt,
                            name: marker.get('name')  
                        };

                        console.log('Güncellenen veri:', updatedData);

                        fetch(`http://localhost:5179/api/points/${id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(updatedData)
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok ' + response.statusText);
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log('Marker başarıyla güncellendi:', data);

                            if (marker.getGeometry().getType() === 'Polygon') {
                                polygonSource.addFeature(marker);
                            } else if (marker.getGeometry().getType() === 'LineString') {
                                lineStringSource.addFeature(marker);
                            }
                            markersMap.set(id, marker);

                            map.removeInteraction(modifyInteraction);
                            panel.close();      
                        })
                        .catch(error => {
                            console.error('Güncelleme işlemi sırasında hata oluştu:', error);
                        });
                    });

                    document.getElementById('cancelUpdateBtn').addEventListener('click', function() {
                        var oldCoordinates3857;
    
                        if (marker.getGeometry().getType() === 'Point') {
                            oldCoordinates3857 = ol.proj.fromLonLat(oldLonLatCoords, 'EPSG:3857');
                            marker.setGeometry(new ol.geom.Point(oldCoordinates3857));
                        } else {
                            marker.setGeometry(new ol.format.WKT().readGeometry(oldWKT, {
                                dataProjection: 'EPSG:4326',
                                featureProjection: 'EPSG:3857'
                            }));
                        }
                    
                        map.removeInteraction(modifyInteraction);
                        panel.close(); 
                    });

                }
            });
        });

    } else {
        console.error('Marker bulunamadı ID:', id);
    }
}  


// Delete işlemi
function deleteMarker(id) {
    if (!id || isNaN(id)) {
        console.error('Geçersiz ID, silme işlemi iptal edildi.');
        return;
    }

    console.log(`Silme işlemi başlatılıyor. ID: ${id}`);

    var confirmPanel = jsPanel.create({
        headerTitle: 'Confirm Delete',
        content: `
            <p>Are you sure you want to delete this?</p>
            <button id="confirmDeleteBtn">Delete</button>
            <button id="cancelDeleteBtn">Cancel</button>
        `,
        panelSize: { width: '300px', height: '150px' },
        position: {
            my: 'center-top',
            at: 'center-top',
            offsetY: 75  
        },
        headerControls: {
            minimize: 'remove', 
            maximize: 'remove',  
            smallify: 'remove'
        },

        callback: function() {
            document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
                fetch(`http://localhost:5179/api/points/${id}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Silme işlemi başarısız: ' + response.statusText);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log(`Marker ID: ${id} başarıyla silindi.`, data);

                    var marker = markersMap.get(parseInt(id));
                    if (marker) {
                        var geometryType = marker.getGeometry().getType();

                        if (geometryType === 'Point') {
                            vectorSource.removeFeature(marker); 
                            console.log(`Point ID: ${id} başarıyla silindi.`);
                        } else if (geometryType === 'Polygon') {
                            polygonSource.removeFeature(marker); 
                            console.log(`Polygon ID: ${id} başarıyla silindi.`);
                        } else if (geometryType === 'LineString') {
                            lineStringSource.removeFeature(marker); 
                            console.log(`LineString ID: ${id} başarıyla silindi.`);
                        }

                        markersMap.delete(parseInt(id));    
                        overlay.setPosition(undefined);    
                        console.log(`Marker ID: ${id} başarıyla haritadan kaldırıldı.`);

                        var rowElement = document.getElementById('row_' + id);
                        if (rowElement) {
                            rowElement.remove(); // Satırı DOM'dan sil
                        }
                    } else {
                        console.error(`Marker ID: ${id} markersMap'te bulunamadı.`);
                    }

                    confirmPanel.close(); 
                })
                .catch(error => {
                    console.error('Marker silinirken hata oluştu:', error);
                    confirmPanel.close(); 
                });
            });

            document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
                confirmPanel.close();
            });
        }
    });
}


function openPanelUpdate(id) {
    console.log(`Opening update panel for Marker ID: ${id}`); 

    var marker = vectorSource.getFeatureById(id); 

    if (!marker) {
        marker = polygonSource.getFeatureById(id); 
        if (!marker) {
            marker = lineStringSource.getFeatureById(id); 
        }
    }

    if (!marker) {
        console.error(`Marker with ID ${id} not found.`);
        return;
    }

    var format = new ol.format.WKT();
    var wkt = format.writeGeometry(marker.getGeometry(), {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
    });

    
    jsPanel.create({
        headerTitle: 'Update Geometry',
        content: `
            <form id="updateForm">
                <label>Name: <input type="text" id="updateName" value="${marker.get('name')}"></label><br>
                <label>WKT: <input type="text" id="updateWKT" value="${wkt}"></label><br>
                <button type="button" id="savePanelUpdateBtn">Save</button>
            </form>
        `,
        panelSize: { width: '300px', height: '200px' },
        resizable: { enabled: true },
        headerControls: {
            minimize: 'remove', 
            maximize: 'remove',  
            smallify: 'remove'
        },

        callback: function(panel) {
            document.getElementById('savePanelUpdateBtn').addEventListener('click', function() {
                var updatedName = document.getElementById('updateName').value;
                var updatedWKT = document.getElementById('updateWKT').value;

                var updatedData = {
                    name: updatedName,
                    wkt: updatedWKT
                };

                fetch(`http://localhost:5179/api/points/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Geometry updated:', data);

                    var updatedFeature = format.readFeature(updatedWKT, {
                        dataProjection: 'EPSG:4326',
                        featureProjection: 'EPSG:3857'
                    });
                    marker.setGeometry(updatedFeature.getGeometry());
                    marker.set('name', updatedName);

                    panel.close();

                    vectorSource.clear();
                    polygonSource.clear();
                    lineStringSource.clear();

                    loadMarkers();
                    loadPolygons();
                    loadLineStrings();      
                
                    map.render();
                })
                .catch(error => {
                    console.error('Error updating geometry:', error);
                });
            });
        }
    });
}


loadMarkers();

loadPolygons();

loadLineStrings();


$(document).ready(function() {
    $('#dataTable').DataTable();
});

var isAddingPoint = false; 

document.getElementById('addPointBtn').addEventListener('click', function () {
    jsPanel.create({
        headerTitle: 'Geometry Type',
        content: `
            <button id="pointBtn">Point</button>
            <button id="polygonBtn">Polygon</button>
            <button id="lineStringBtn">LineString</button>
        `,
        panelSize: {
            width: '250px',
            height: '90px'
        },
        position: {
            my: 'center-top',
            at: 'center-top',
            offsetX: 810,
            offsetY: 60
        },
        headerControls: {
            minimize: 'remove', 
            maximize: 'remove',  
            smallify: 'remove'
        },
        callback: function (panel) {
            document.getElementById('pointBtn').addEventListener('click', function () {
                panel.close();
                console.log('Add Point button clicked'); 
                map.getViewport().style.cursor = 'crosshair';
                isAddingPoint = true; 

                var addPointInteraction = new ol.interaction.Pointer({
                    handleDownEvent: function (evt) {
            if (!isAddingPoint) return; 

            console.log('Map clicked'); 
            var coordinate = evt.coordinate;
            var format = new ol.format.WKT();
            var lonLatCoordinate = ol.proj.toLonLat(coordinate); 
            var wktCoordinate = format.writeGeometry(new ol.geom.Point(coordinate), {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            });

            var previewMarker = new ol.Feature({
                geometry: new ol.geom.Point(coordinate)
            });
            var previewMarkerStyle = new ol.style.Style({
                image: new ol.style.Icon({
                    src: './images/icon.png',
                    scale: 0.6
                })
            });
            previewMarker.setStyle(previewMarkerStyle);

            var previewVectorSource = new ol.source.Vector({
                features: [previewMarker]
            });
            var previewVectorLayer = new ol.layer.Vector({
                source: previewVectorSource
            });
            map.addLayer(previewVectorLayer);

            var pixel = map.getPixelFromCoordinate(coordinate);

            jsPanel.create({
                headerTitle: 'Add Point',
                content: `
                    <form id="pointForm">
                        <label>WKT: <input type="text" id="wktCoord" value="${wktCoordinate}" readonly></label><br>
                        <label>Name: <input type="text" id="pointName"></label><br>
                        <button type="button" id="savePointBtn">Save</button>
                        <button type="button" id="cancelPointBtn">Cancel</button>
                    </form>
                `,
                position: {
                    my: 'left-top',
                    at: 'left-top',
                    offsetX: pixel[0] + 20,
                    offsetY: pixel[1] + 20
                },
                headerControls: {
                    minimize: 'remove', 
                    maximize: 'remove',  
                    smallify: 'remove'
                },

                callback: function (panel) {
                    console.log('JSPanel created'); 
                    setTimeout(function () {
                        document.getElementById('pointName').focus();
                    }, 100);

                    document.getElementById('savePointBtn').addEventListener('click', function () {
                        var name = document.getElementById('pointName').value;
                        var wkt = document.getElementById('wktCoord').value;
                        if (name) {
                            console.log('Saving point:', wkt, name); 

                            fetch('http://localhost:5179/api/points', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    wkt: wkt,
                                    name: name
                                })
                            })
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error('Network response was not ok ' + response.statusText);
                                    }
                                    return response.json();
                                })
                                .then(data => {
                                    console.log('Point saved:', data); 
                                    var savedId = data.value.id; 

                                    // ID'nin doğru atanıp atanmadığını kontrol et
                                    console.log('Saved Marker ID:', savedId); 

                                    if (typeof vectorSource === 'undefined') {
                                        console.error('vectorSource is not defined');
                                        return;
                                    }

                                    var newMarker = format.readFeature(wkt, {
                                        dataProjection: 'EPSG:4326',
                                        featureProjection: 'EPSG:3857'
                                    });
                                    newMarker.set('name', name);
                                    newMarker.setId(savedId); 

                                    vectorSource.addFeature(newMarker); 
                                    markersMap.set(savedId, newMarker); 

                                    $('#dataTable').DataTable().row.add([
                                        lonLatCoordinate[0],
                                        lonLatCoordinate[1],
                                        name,
                                        '<button class="deleteBtn" data-id="' + savedId + '">Delete</button>'
                                    ]).draw();

                                    showCustomAlert('Marker saved successfully!');
                                    panel.close();
                                })
                                .catch(error => {
                                    console.error('Error saving point:', error);
                                });
                        } else {
                            console.log('Name is required'); 
                        }
                    });

                    document.getElementById('cancelPointBtn').addEventListener('click', function () {
                        panel.close();
                    });
                },
                onclosed: function () {
                    console.log('JSPanel closed'); 
                    map.getViewport().style.cursor = 'default';
                    map.removeInteraction(addPointInteraction);
                    map.removeLayer(previewVectorLayer);
                    isAddingPoint = false; 
                }
            });

            return false; 
        }
    });
                map.addInteraction(addPointInteraction);

            });


document.getElementById('polygonBtn').addEventListener('click', function () {
    console.log('Polygon ekleme modu aktif.');
    map.getViewport().style.cursor = 'crosshair'; 
    isAddingPolygon = true; 
    polygonCoordinates = []; 

    if (typeof panel !== 'undefined' && panel) {
        panel.close();
    }

    map.getInteractions().forEach(function (interaction) {
        if (interaction instanceof ol.interaction.DoubleClickZoom) {
            map.removeInteraction(interaction);
        }
    });

    var originalInteractions = map.getInteractions().getArray().slice();
    map.getInteractions().clear();

    var drawPolygonInteraction = new ol.interaction.Draw({
        source: polygonSource, 
        type: 'Polygon',
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'blue',
                width: 2
            }),
            fill: new ol.style.Fill({
                color: 'rgba(0, 0, 255, 0.2)' 
            })
        })
    });

    map.addInteraction(drawPolygonInteraction);

    var addedPolygonFeature = null; 

    var pointFeatures = []; 
    drawPolygonInteraction.on('drawstart', function (event) {
        map.getViewport().style.cursor = 'crosshair'; 
        var feature = event.feature;
        feature.getGeometry().on('change', function () {
            var coordinates = feature.getGeometry().getCoordinates()[0]; 
            polygonCoordinates = coordinates.slice(0); 

            pointFeatures.forEach(function (point) {
                polygonSource.removeFeature(point); 
            });
            pointFeatures = []; 

            polygonCoordinates.forEach(function (coord) {
                var pointFeature = new ol.Feature({
                    geometry: new ol.geom.Point(coord)
                });
                var pointStyle = new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 6,
                        fill: new ol.style.Fill({
                            color: 'blue'
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'white',
                            width: 2
                        })
                    })
                });
                pointFeature.setStyle(pointStyle);
                polygonSource.addFeature(pointFeature);
                pointFeatures.push(pointFeature); 
            });
        });
    });

    drawPolygonInteraction.on('drawend', function (event) {
        addedPolygonFeature = event.feature; 
        map.removeInteraction(drawPolygonInteraction); 
        map.getViewport().style.cursor = 'default'; 
        isAddingPolygon = false; 

        pointFeatures.forEach(function (point) {
            polygonSource.removeFeature(point);
        });

        var format = new ol.format.WKT();
        var wktPolygon = format.writeGeometry(event.feature.getGeometry(), {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        });

        console.log('Polygon WKT formatında:', wktPolygon);

        jsPanel.create({
            headerTitle: 'Add Polygon',
            content: `
                <form id="polygonForm">
                    <label>WKT: <input type="text" id="wktPolygon" value="${wktPolygon}" readonly></label><br>
                    <label>Name: <input type="text" id="polygonName"></label><br>
                    <button type="button" id="savePolygonBtn">Save</button>
                    <button type="button" id="cancelPolygonBtn">Cancel</button>
                </form>
            `,
            position: 'center-top 0 100',
            headerControls: {
                minimize: 'remove',
                maximize: 'remove',
                smallify: 'remove'
            },
            callback: function (panel) {
                document.getElementById('savePolygonBtn').addEventListener('click', function () {
                    var name = document.getElementById('polygonName').value;
                    if (name) {
                        console.log('Polygon kaydediliyor:', wktPolygon, name);

                        fetch('http://localhost:5179/api/points', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                wkt: wktPolygon,
                                name: name
                            })
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok ' + response.statusText);
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log('Polygon başarıyla kaydedildi:', data);
                            var savedId = data.value.id;

                            event.feature.setId(savedId);
                            event.feature.set('name', name);
                            polygonSource.addFeature(event.feature); 
                            markersMap.set(savedId, event.feature);

                            panel.close(); 

                        })
                        .catch(error => {
                            console.error('Polygon kaydedilirken hata oluştu:', error);
                        });
                    } else {
                        console.log('Ad gerekli.');
                    }
                });

                document.getElementById('cancelPolygonBtn').addEventListener('click', function () {
                    polygonSource.removeFeature(addedPolygonFeature);
                    panel.close();
                });
            }
        });

        originalInteractions.forEach(function (interaction) {
            map.addInteraction(interaction);
        });
    });

    drawPolygonInteraction.on('drawstart', function () {
        map.getViewport().style.cursor = 'crosshair'; 
    });
});
        

document.getElementById('lineStringBtn').addEventListener('click', function () {
    console.log('LineString ekleme modu aktif.');
    map.getViewport().style.cursor = 'crosshair'; 
    isAddingLineString = true; 

    panel.close();

    map.getInteractions().forEach(function (interaction) {
        if (interaction instanceof ol.interaction.DoubleClickZoom) {
            map.removeInteraction(interaction);
        }
    });

    var drawLineStringInteraction = new ol.interaction.Draw({
        source: lineStringSource, 
        type: 'LineString',
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'blue', 
                width: 2
            })
        })
    });

    map.addInteraction(drawLineStringInteraction);

    var addedLineStringFeature;

    drawLineStringInteraction.on('drawend', function (event) {
        addedLineStringFeature = event.feature;
        map.removeInteraction(drawLineStringInteraction); 
        map.getViewport().style.cursor = 'default'; 
        isAddingLineString = false; 

        var format = new ol.format.WKT();
        var wktLineString = format.writeGeometry(event.feature.getGeometry(), {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        });

        console.log('LineString WKT formatında:', wktLineString);

        jsPanel.create({
            headerTitle: 'Add LineString',
            content: `
                <form id="lineStringForm">
                    <label>WKT: <input type="text" id="wktLineString" value="${wktLineString}" readonly></label><br>
                    <label>Name: <input type="text" id="lineStringName"></label><br>
                    <button type="button" id="saveLineStringBtn">Save</button>
                    <button type="button" id="cancelLineStringBtn">Cancel</button>
                </form>
            `,
            position: 'center-top 0 100',
            headerControls: {
                minimize: 'remove',
                maximize: 'remove',
                smallify: 'remove'
            },
            callback: function (panel) {
                document.getElementById('saveLineStringBtn').addEventListener('click', function () {
                    var name = document.getElementById('lineStringName').value;
                    if (name) {
                        console.log('LineString kaydediliyor:', wktLineString, name);

                        fetch('http://localhost:5179/api/points', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                wkt: wktLineString,
                                name: name
                            })
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok ' + response.statusText);
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log('LineString başarıyla kaydedildi:', data);
                            var savedId = data.value.id;

                            event.feature.setId(savedId);
                            event.feature.set('name', name);
                            lineStringSource.addFeature(event.feature); 
                            markersMap.set(savedId, event.feature);

                            panel.close();  

                        })
                        .catch(error => {
                            console.error('LineString kaydedilirken hata oluştu:', error);
                        });
                    } else {
                        console.log('Ad gerekli.');
                    }
                });

                document.getElementById('cancelLineStringBtn').addEventListener('click', function () {
                    lineStringSource.removeFeature(addedLineStringFeature);
                    panel.close();
                });
            }
        });

        map.getInteractions().forEach(function (interaction) {
            map.addInteraction(interaction);
        });
    });
});
}
});
});

// Custom Alert 
function showCustomAlert(message) {
    var alertDiv = document.createElement('div');
    alertDiv.className = 'custom-alert';
    alertDiv.innerText = message;
    document.body.appendChild(alertDiv);

    setTimeout(function () {
        alertDiv.style.opacity = '0';
        setTimeout(function () {
            document.body.removeChild(alertDiv);
        }, 600);
    }, 3000);
}

document.getElementById('queryBtn').addEventListener('click', function() {
    console.log('Query button clicked'); 

    fetch('http://localhost:5179/api/points')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data fetched:', data); 

            var tableContent = `
                <table id="queryTable" class="display">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>WKT</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.value.forEach(item => { 
                var rowId = 'row_' + item.id;
                tableContent += `
                    <tr id="${rowId}">
                        <td>${item.name}</td>
                        <td>${item.wkt}</td>
                        <td>
                            <button class="updateBtn" data-id="${item.id}">Update</button>
                            <button class="showBtn" data-id="${item.id}" data-wkt="${item.wkt}">Show</button>
                            <button class="deleteBtn" data-id="${item.id}" data-wkt="${item.wkt}">Delete</button>
                        </td>
                    </tr>
                `;
            });

            tableContent += `
                    </tbody>
                </table>
            `;

            jsPanel.create({
                headerTitle: 'Query Results',
                content: tableContent,
                panelSize: {
                    width: '50vw',
                    height: '45vh'
                },
                id: 'queryPanel',
                resizable: { enabled: true },
                headerControls: {
                    minimize: 'remove', 
                    maximize: 'remove',  
                    smallify: 'remove'
                },

                callback: function(panel) {
                    console.log('JSPanel created'); 

                    $('#queryTable').DataTable();


document.querySelectorAll('.updateBtn').forEach(button => {
    button.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        console.log('Update button clicked for ID:', id); 

        jsPanel.create({
            headerTitle: 'Update Options',
            content: `
                <button class="panelUpdateBtn" data-id="${id}">Panel Update</button>
                <button class="manualUpdateBtn" data-id="${id}">Manual Update</button>
            `,
            headerControls: {
                minimize: 'remove', 
                maximize: 'remove',  
                smallify: 'remove'
            },

            callback: function (panel) {
                
                document.querySelectorAll('.panelUpdateBtn').forEach(button => {
                    button.addEventListener('click', function () {
                    var id = this.getAttribute('data-id'); 
                    console.log('Panel Update button clicked for ID:', id);

                    if (!id) {
                    console.error('ID is null or undefined.');
                    return;
                }

                jsPanel.getPanels().forEach(panel => {
                    if (panel.options.id !== 'updatePanel_' + id) {  
                        panel.close();
                    }
                });

                openPanelUpdate(id);
            });
        });


                document.querySelectorAll('.manualUpdateBtn').forEach(button => {
                    button.addEventListener('click', function () {
                    var id = this.getAttribute('data-id'); 
                    console.log('Manual Update button clicked for ID:', id);

                    if (!id) {
                    console.error('ID is null or undefined.');
                    return;
                }

                openManualUpdate(id);
            });
        });

            }
        });
    });
}); 

                    document.querySelectorAll('.showBtn').forEach(button => {
                        button.addEventListener('click', function () {
                            var wkt = this.getAttribute('data-wkt');
                            var format = new ol.format.WKT();
                            var feature = format.readFeature(wkt, {
                                dataProjection: 'EPSG:4326',
                                featureProjection: 'EPSG:3857'
                            });
                    
                            var geometry = feature.getGeometry();
                            var coordinates = geometry.getCoordinates();
                    
                            if (!coordinates) {
                                console.error('Projection failed for WKT:', wkt);
                                return;
                            }
                    
                            console.log('Zooming to coordinates:', coordinates);
                    
                            if (geometry.getType() === 'Point') {
                                map.getView().animate({
                                    center: coordinates,
                                    duration: 1000,
                                    zoom: 10
                                });
                            } else if (geometry.getType() === 'Polygon' || geometry.getType() === 'LineString') {
                                var extent = geometry.getExtent();
                    
                                map.getView().fit(extent, {
                                    duration: 1000,
                                    padding: [50, 50, 50, 50], 
                                    maxZoom: 20 
                                });
                            }
                    
                            jsPanel.getPanels().forEach(panel => {
                                panel.close();
                            });
                        });
                    });
                    

                    
                    document.getElementById('zoomOutBtn').addEventListener('click', function() {
                        var view = map.getView();
                        var currentZoom = view.getZoom();
                        view.animate({
                            zoom: currentZoom - 5,
                            duration: 500
                        });
                    });                    

                    document.querySelectorAll('.deleteBtn').forEach(button => {
                        button.addEventListener('click', function() {
                            var id = this.getAttribute('data-id');
                            console.log('Delete button clicked for ID:', id); 

                            deleteMarker(id);  
                        });
                    });

                }
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
});