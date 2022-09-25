/*
    Insight custom dashboard framework

    Framework for implementing Insight 4.x dashboard views
    
    (c) Copyright 2019 Fair Isaac Corporation
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

describe("Dashboard", function() {
    var dashboard;

    function initDashboardObject() {
        dashboard = new Dashboard({
            viewId: 'test_view',
            executionMode: 'test_executionMode',
            systemFolder: '_system',
            dependencyPath: '/test_dependencyPath',
            dependencyExclusions: '/test_dependencyExclusion'
        });
        dashboard.apiBase = "/insightservices/rest/v1/";
        dashboard.scenarioId = 'SCENARIOID';
        dashboard.folderId = 'FOLDERID';
        dashboard.userId = 'USERID';
    }

    beforeEach(function () {
        jasmine.Ajax.install();


        // global stubs
        window.VDL = function () {
        };
        VDL.createVariable = function () {
        };

        window.insight = {
            getView: function () {
                return {
                    configure: function () {
                        return this;
                    },
                    getApp: function () {
                        return {
                            getId: function () {
                                return 'APPID';
                            }
                        };
                    },
                    getUser: function () {
                        return Promise.resolve({
                            getUsername: function () {
                                return 'USERID';
                            }
                        });
                    },
                    showErrorMessage () {}
                }
            },
            resolveRestEndpoint: jasmine.createSpy().and.callFake(_.identity)
        };


    });

    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    describe("_findSystemFolder()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should resolve to true if the system folder exists", function () {
            var promise = dashboard._findSystemFolder()
                .then((found) => {
                    expect(found).toEqual('FOLDERID');
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/APPID/folder');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses._findFolder.someFolders);
            return promise;
        });

        it("should resolve to true if the system folder name has been customized and exists", function () {
            dashboard.config.systemFolder = "customfolder";
            var promise = dashboard._findSystemFolder()
                .then((found) => {
                    expect(found).toEqual('CUSTOMID');
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/APPID/folder');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses._findFolder.someFolders);
            return promise;
        });

        it("should resolve to false if the system folder does not exist", function () {
            dashboard.config.systemFolder = 'folderdoesntexist';
            var promise = dashboard._findSystemFolder()
                .then((found) => {
                    expect(found).toBe(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/APPID/folder');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses._findFolder.someFolders);
            return promise;
        });

        it("should resolve to false if no folders exist", function () {
            var promise = dashboard._findSystemFolder()
                .then((found) => {
                    expect(found).toBe(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/APPID/folder');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses._findFolder.noFolders);
            return promise;
        });

        it("should throw an error if the call to the server doesnt return 200", function () {
            var promise = dashboard._findSystemFolder()
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/APPID/folder');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("_createSystemFolder()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should return an id if it successfully creates a folder", function () {
            var promise = dashboard._createSystemFolder()
                .then((id) => {
                    expect(id).toEqual('FOLDERID');
                });
            var request = jasmine.Ajax.requests.mostRecent();
            console.log(request);
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).displayName).toBe("_system");
            expect(JSON.parse(request.params).parent.id).toBe("APPID");
            var response = testResponses._createFolder.success;
            response.responseText = JSON.stringify({
                id: "FOLDERID",
                displayName: "_system"
            });
            request.respondWith(response);
            return promise;
        });

        it("should throw an error if it fails to create a folder", function () {
            var promise = dashboard._createSystemFolder()
                .then((id) => {
                    // should not success!
                    fail();
                })
                .catch((error) => {
                    // expected
                })
            var request = jasmine.Ajax.requests.mostRecent();
            console.log(request);
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).displayName).toBe("_system");
            expect(JSON.parse(request.params).parent.id).toBe("APPID");

            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("_shareSystemFolder()", function () {
        beforeEach(function () {
            initDashboardObject();
            dashboard.folderId = "FOLDERID";
        });

        it("should fail if the system folder id isnt known", function () {
            dashboard.folderId = null;
            expect(dashboard._findUserDashboardScenario).toThrow();
        });

        it("should return an id if it successfully shares a folder", function () {
            var promise = dashboard._shareSystemFolder()
                .then((id) => {
                    expect(id).toEqual(dashboard.folderId);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/' + dashboard.folderId + "?cascadeShareStatus=false&cascadeOwner=false");
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).id).toBe(dashboard.folderId);
            expect(JSON.parse(request.params).shareStatus).toBe("FULLACCESS");
            request.respondWith(testResponses.shareFolder.success);
            return promise;
        });

        it("should throw an error if it fails to share the folder", function () {
            var promise = dashboard._shareSystemFolder()
                .then((id) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected
                })
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/' + dashboard.folderId + "?cascadeShareStatus=false&cascadeOwner=false");
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).id).toBe(dashboard.folderId);
            expect(JSON.parse(request.params).shareStatus).toBe("FULLACCESS");
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("_findUserDashboardScenario()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should fail if the system folder id isnt known", function () {
            dashboard.folderId = null;
            expect(dashboard._findUserDashboardScenario).toThrow();
        });

        it("should fail if the user id isnt knownn", function () {
            dashboard.userId = null;
            expect(dashboard._findUserDashboardScenario).toThrow();
        });

        it("should resolve to true if the dashboard scenario exists", function () {
            var promise = dashboard._findUserDashboardScenario()
                .then((found) => {
                    expect(found).toEqual('SCENARIOID');
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/' + dashboard.folderId + '/children');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.findScenario.someScenarios);
            return promise;
        });

        it("should resolve to false if the system folder does not exist", function () {
            var promise = dashboard._findUserDashboardScenario()
                .then((found) => {
                    expect(found).toBe(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/' + dashboard.folderId + '/children');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.findScenario.noScenarios);
            return promise;
        });

        it("should throw an error if the call to the server doesnt return 200", function () {
            var promise = dashboard._findUserDashboardScenario()
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/' + dashboard.folderId + '/children');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("_isUserDashboardScenarioLoaded()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should fail if the dashboard scenario id isnt known", function () {
            dashboard.scenarioId = null;
            expect(dashboard._isUserDashboardScenarioLoaded).toThrow();
        });

        it("should resolve to true if the dashboard scenario is loaded", function () {
            var promise = dashboard._isUserDashboardScenarioLoaded()
                .then((loaded) => {
                    expect(loaded).toBe(true);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + dashboard.scenarioId);
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.isScenarioLoaded.loaded);
            return promise;
        });

        it("should resolve to false if the dashboard scenario is not loaded", function () {
            var promise = dashboard._isUserDashboardScenarioLoaded()
                .then((loaded) => {
                    expect(loaded).toBe(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + dashboard.scenarioId);
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.isScenarioLoaded.notLoaded);
            return promise;
        });

        it("should throw an error if the call to the server doesnt return 200", function () {
            var promise = dashboard._isUserDashboardScenarioLoaded()
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + dashboard.scenarioId);
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("_loadUserDashboardScenario()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should fail if the dashboard scenario id isnt known", function () {
            dashboard.scenarioId = null;
            expect(dashboard._loadUserDashboardScenario).toThrow();
        });

        it("should resolve to true if the dashboard scenario is successfully submitted for execution", function () {
            var promise = dashboard._loadUserDashboardScenario()
                .then((success) => {
                    expect(success).toEqual(true);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/execution');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).id).toBe('SCENARIOID');
            expect(JSON.parse(request.params).jobType).toBe('test_executionMode');
            request.respondWith(testResponses.loadScenario.success);
            return promise;
        });

        it("should throw an error if the dashboard scenario is not successfully submitted for execution", function () {
            var promise = dashboard._loadUserDashboardScenario()
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/execution');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).id).toBe('SCENARIOID');
            expect(JSON.parse(request.params).jobType).toBe('test_executionMode');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("_isUserDashboardScenarioExecuting()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should fail if the dashboard scenario id isnt known", function () {
            dashboard.scenarioId = null;
            expect(dashboard._isUserDashboardScenarioExecuting).toThrow();
        });

        it("should resolve to true if the dashboard scenario is executing", function () {
            var promise = dashboard._isUserDashboardScenarioExecuting()
                .then((executing) => {
                    expect(executing).toEqual(true);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + dashboard.scenarioId + '/job');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.isExecuting.executing);
            return promise;
        });

        it("should resolve to false if the dashboard scenario is not executing", function () {
            var promise = dashboard._isUserDashboardScenarioExecuting()
                .then((executing) => {
                    expect(executing).toEqual(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + dashboard.scenarioId + '/job');
            expect(request.method).toBe('GET');
            request.respondWith(testResponses.isExecuting.notExecuting);
            return promise;
        });
    });

    describe("_doOverlay()", function () {
        beforeEach(function () {
            initDashboardObject();
            spyOn($.fn, "trigger");
            dashboard.current = function () {
            }; // stub for ko observable
        });

        it("should show the overlay when asked to show the overlay", function () {
            dashboard._showOverlay(true);
            expect($.fn.trigger).toHaveBeenCalledWith("dashboard.overlay.show");
        });

        it("should show the overlay when asked to hide the overlay", function () {
            dashboard._showOverlay(false);
            expect($.fn.trigger).toHaveBeenCalledWith("dashboard.overlay.hide");
        });
    });

    describe("_dependencyModified()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should resolve to true if the server says something has changed since timestamp", function () {
            var timestamp = 1234;
            var promise = dashboard._dependencyModified(timestamp)
                .then((modified) => {
                    expect(modified).toEqual(true);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/' + dashboard.appId + '/dashboard/status');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).timestamp).toBe(timestamp);
            expect(JSON.parse(request.params).path).toBe('/test_dependencyPath');
            expect(JSON.parse(request.params).exclusions[0]).toBe('/_system');
            expect(JSON.parse(request.params).exclusions[1]).toBe('/test_dependencyExclusion');
            request.respondWith(testResponses.dependencyModified.modified);
            return promise;
        });

        it("should resolve to false if the server says nothing has changed since timestamp", function () {
            var timestamp = 1234;
            var promise = dashboard._dependencyModified(timestamp)
                .then((modified) => {
                    expect(modified).toEqual(false);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/' + dashboard.appId + '/dashboard/status');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).timestamp).toBe(timestamp);
            expect(JSON.parse(request.params).path).toBe('/test_dependencyPath');
            expect(JSON.parse(request.params).exclusions[0]).toBe('/_system');
            expect(JSON.parse(request.params).exclusions[1]).toBe('/test_dependencyExclusion');
            request.respondWith(testResponses.dependencyModified.notModified);
            return promise;
        });

        it("should throw an error if the server does not return 200", function () {
            var timestamp = 1234;
            var promise = dashboard._dependencyModified(timestamp)
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/project/' + dashboard.appId + '/dashboard/status');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).timestamp).toBe(timestamp);
            expect(JSON.parse(request.params).path).toBe('/test_dependencyPath');
            expect(JSON.parse(request.params).exclusions[0]).toBe('/_system');
            expect(JSON.parse(request.params).exclusions[1]).toBe('/test_dependencyExclusion');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("_getLastExecutionDate()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should throw an error if the dashboard scenario id isnt known", function () {
            dashboard.scenarioId = null;
            expect(dashboard._getLastExecutionDate).toThrow();
        });

        it("should return the last execution timestamp", function () {
            var promise = dashboard._getLastExecutionDate()
                .then((timestamp) => {
                    expect(timestamp).toEqual(123456789);
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + dashboard.scenarioId + '/data');
            expect(request.method).toBe('POST');
            request.respondWith(testResponses.getLastExecutionDate.response);
            return promise;
        });

        it("should throw an error if the server does not return 200", function () {
            var promise = dashboard._getLastExecutionDate()
                .then((success) => {
                    // should not succeed!
                    fail();
                })
                .catch((error) => {
                    // expected the error
                });
            var request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('/insightservices/rest/v1/data/scenario/' + dashboard.scenarioId + '/data');
            expect(request.method).toBe('POST');
            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("_createSystemFolder()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should return an id if it successfully creates a folder", function () {
            var promise = dashboard._createSystemFolder()
                .then((id) => {
                    expect(id).toEqual('FOLDERID');
                });
            var request = jasmine.Ajax.requests.mostRecent();
            console.log(request);
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).displayName).toBe("_system");
            expect(JSON.parse(request.params).parent.id).toBe("APPID");
            var response = testResponses._createFolder.success;
            response.responseText = JSON.stringify({
                id: "FOLDERID",
                displayName: "_system"
            });
            request.respondWith(response);
            return promise;
        });

        it("should throw an error if it fails to create a folder", function () {
            var promise = dashboard._createSystemFolder()
                .then((id) => {
                    // should not success!
                    fail();
                })
                .catch((error) => {
                    // expected
                })
            var request = jasmine.Ajax.requests.mostRecent();
            console.log(request);
            expect(request.url).toBe('/insightservices/rest/v1/data/folder/');
            expect(request.method).toBe('POST');
            expect(JSON.parse(request.params).displayName).toBe("_system");
            expect(JSON.parse(request.params).parent.id).toBe("APPID");

            request.respondWith(testResponses.serverError);
            return promise;
        });
    });

    describe("_findOrCreateSystemFolder()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should return an id if the folder already exists", function (done) {
            spyOn(dashboard, "_findSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_createSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_shareSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            dashboard._findOrCreateSystemFolder()
                .then((id) => {
                    expect(id).toBe("FOLDERID");
                    expect(dashboard._findSystemFolder).toHaveBeenCalled();
                    expect(dashboard._createSystemFolder).not.toHaveBeenCalled();
                    done();
                });
        });

        it("should return an id if the folder doesnt exist", function (done) {
            spyOn(dashboard, "_findSystemFolder").and.returnValue(Promise.resolve(false));
            spyOn(dashboard, "_createSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_shareSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            dashboard._findOrCreateSystemFolder()
                .then((id) => {
                    expect(id).toBe("FOLDERID");
                    expect(dashboard._findSystemFolder).toHaveBeenCalled();
                    expect(dashboard._createSystemFolder).toHaveBeenCalled();
                    done();
                });
        })
    });

    describe("_findOrCreateUserDashboardScenario()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should return an id if the scenario already exists", function (done) {
            spyOn(dashboard, "_findUserDashboardScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            spyOn(dashboard, "_createUserDashboardScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            dashboard._findOrCreateUserDashboardScenario()
                .then((id) => {
                    expect(id).toBe("SCENARIOID");
                    expect(dashboard._findUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._createUserDashboardScenario).not.toHaveBeenCalled();
                    done();
                });
        });

        it("should return an id if the scenario doesnt exist", function (done) {
            spyOn(dashboard, "_findUserDashboardScenario").and.returnValue(Promise.resolve(false));
            spyOn(dashboard, "_createUserDashboardScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            dashboard._findOrCreateUserDashboardScenario()
                .then((id) => {
                    expect(id).toBe("SCENARIOID");
                    expect(dashboard._findUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._createUserDashboardScenario).toHaveBeenCalled();
                    done();
                });
        })
    });

    describe("_ensureUserDashboardScenarioLoaded()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should do nothing if the scenario is already loaded", function (done) {
            spyOn(dashboard, "_isUserDashboardScenarioLoaded").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_loadUserDashboardScenario").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_doOverlay").and.returnValue(Promise.resolve(true));
            dashboard._ensureUserDashboardScenarioLoaded()
                .then(() => {
                    expect(dashboard._isUserDashboardScenarioLoaded).toHaveBeenCalled();
                    expect(dashboard._loadUserDashboardScenario).not.toHaveBeenCalled();
                    expect(dashboard._doOverlay).toHaveBeenCalled();
                    done();
                });
        });

        it("should load the scenario and force the overlay if the scenario is not already loaded", function (done) {
            spyOn(dashboard, "_isUserDashboardScenarioLoaded").and.returnValue(Promise.resolve(false));
            spyOn(dashboard, "_loadUserDashboardScenario").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_doOverlay").and.returnValue(Promise.resolve(true));
            dashboard._ensureUserDashboardScenarioLoaded()
                .then(() => {
                    expect(dashboard._isUserDashboardScenarioLoaded).toHaveBeenCalled();
                    expect(dashboard._loadUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._doOverlay).toHaveBeenCalledWith(true);
                    done();
                });
        });
    });

    describe("constructor()", function () {
        var config = {
            viewId: 'test_view', // name of the dashboard view
            systemFolder: 'test_systemFolder', // location for the dashboard scenarios
            executionMode: 'test_executionMode', // custom load mode for running the dashboard scenairo
            executionPollingInterval: 100, // seconds between polls to see if the dashboard scenario has finished executing
            dependencyCheck: true, // should the dependency check be run automatically
            dependencyPollingInterval: 101, // seconds frequency for running the dependency check
            dependencyPath: '/test_dependencyPath', // repository path relative to the app that the dependency check starts from
            dependencyExclusions: ['test_dependencyExclusion'] // folders to exclude from the dependency check
        };

        it("should apply user config settings", function () {
            var self = this;
            config.systemFolder = "test_systemFolder";
            var temp = new Dashboard(config);
            $.each(temp.config, function (key, value) {
                expect(temp.config[key]).toEqual(config[key]);
            });
        });

        it("should throw an error if the system folder is not a folder in the root", function () {
            var self = this;
            var temp;
            config.systemFolder = "folder/nested folder";
            expect(Dashboard.bind(temp, config)).toThrow();
        });
    });

    describe("start()", function () {
        beforeEach(function () {
            initDashboardObject();
        });

        it("should return the scenario id given the system folder and dashboard scenario already exist", function (done) {
            spyOn(dashboard, "_findSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_createSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_shareSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_findUserDashboardScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            spyOn(dashboard, "_createUserDashboardScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            spyOn(dashboard, "_isUserDashboardScenarioLoaded").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_loadUserDashboardScenario").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_doOverlay").and.returnValue(true);

            dashboard.start()
                .then((ids) => {
                    expect(ids[0]).toBe('SCENARIOID');
                    expect(dashboard._findSystemFolder).toHaveBeenCalled();
                    expect(dashboard._createSystemFolder).not.toHaveBeenCalled();
                    expect(dashboard._shareSystemFolder).not.toHaveBeenCalled();
                    expect(dashboard._findUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._createUserDashboardScenario).not.toHaveBeenCalled();
                    expect(dashboard._isUserDashboardScenarioLoaded).toHaveBeenCalled();
                    expect(dashboard._loadUserDashboardScenario).not.toHaveBeenCalled();
                    expect(dashboard._doOverlay).toHaveBeenCalled();
                    done();
                });
        });

        it("should return the scenario id given the system folder exists and the dashboard scenario doesnt", function (done) {
            spyOn(dashboard, "_findSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_createSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_shareSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_findUserDashboardScenario").and.returnValue(Promise.resolve(false));
            spyOn(dashboard, "_createUserDashboardScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            spyOn(dashboard, "_isUserDashboardScenarioLoaded").and.returnValue(Promise.resolve(false));
            spyOn(dashboard, "_loadUserDashboardScenario").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_doOverlay").and.returnValue(true);

            dashboard.start()
                .then((ids) => {
                    expect(ids[0]).toBe('SCENARIOID');
                    expect(dashboard._findSystemFolder).toHaveBeenCalled();
                    expect(dashboard._createSystemFolder).not.toHaveBeenCalled();
                    expect(dashboard._shareSystemFolder).not.toHaveBeenCalled();
                    expect(dashboard._findUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._createUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._isUserDashboardScenarioLoaded).toHaveBeenCalled();
                    expect(dashboard._loadUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._doOverlay).toHaveBeenCalled();
                    done();
                });
        });

        it("should return the scenario id given neither the system folder nor dashboard scenario exist", function (done) {
            spyOn(dashboard, "_findSystemFolder").and.returnValue(Promise.resolve(false));
            spyOn(dashboard, "_createSystemFolder").and.returnValue(Promise.resolve("FOLDERID"));
            spyOn(dashboard, "_shareSystemFolder").and.returnValue("FOLDERID");
            spyOn(dashboard, "_findUserDashboardScenario").and.returnValue(Promise.resolve(false));
            spyOn(dashboard, "_createUserDashboardScenario").and.returnValue(Promise.resolve("SCENARIOID"));
            spyOn(dashboard, "_isUserDashboardScenarioLoaded").and.returnValue(Promise.resolve(false));
            spyOn(dashboard, "_loadUserDashboardScenario").and.returnValue(Promise.resolve(true));
            spyOn(dashboard, "_doOverlay").and.returnValue(true);

            dashboard.start()
                .then((ids) => {
                    expect(ids[0]).toBe('SCENARIOID');
                    expect(dashboard._findSystemFolder).toHaveBeenCalled();
                    expect(dashboard._createSystemFolder).toHaveBeenCalled();
                    expect(dashboard._shareSystemFolder).toHaveBeenCalled();
                    expect(dashboard._findUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._createUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._isUserDashboardScenarioLoaded).toHaveBeenCalled();
                    expect(dashboard._loadUserDashboardScenario).toHaveBeenCalled();
                    expect(dashboard._doOverlay).toHaveBeenCalled();
                    done();
                });
        });
    });
});
