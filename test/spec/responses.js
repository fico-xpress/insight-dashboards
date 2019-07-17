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

var testResponses = {
    serverError: {
        status: 500
    },
    findFolder: {
        someFolders: {
            status: 200,
            responseText: JSON.stringify({
                items: [
                    {
                        'id': 'FOLDERID',
                        'displayName': '_system'
                    },
                    {
                        'id': 'CUSTOMID',
                        'displayName': 'customfolder'
                    }
                    ]
            })
        },
        noFolders: {
            status: 200,
            responseText: JSON.stringify({
                items: []
            })
        }
    },
    createFolder: {
        success: {
            status: 200,
            responseText: null // dynamic
        }
    },
    shareFolder: {
        success: {
            status: 200,
            responseText: JSON.stringify({
                id: 'FOLDERID'
            })
        }
    },
    findScenario: {
        someScenarios: {
            status: 200,
            responseText: JSON.stringify({
                items: [
                    {
                        'id': 'SCENARIO1',
                        'displayName': 'scenario 1'
                    },
                    {
                        'id': 'SCENARIOID',
                        'displayName': 'test_view.USERID'
                    },
                    {
                        'id': 'SCENARIO2',
                        'displayName': 'scenario 3'
                    }
                ]
            })
        },
        noScenarios: {
            status: 200,
            responseText: JSON.stringify({
                items: []
            })
        }
    },
    isScenarioLoaded: {
        loaded: {
            status: 200,
            responseText: JSON.stringify({
                loaded: true
            })
        },
        notLoaded: {
            status: 200,
            responseText: JSON.stringify({
                loaded: false
            })
        }
    },
    loadScenario: {
        success: {
            status: 200,
            responseText: JSON.stringify({})
        }
    },
    isExecuting: {
        executing: {
            status: 200,
            responseText: JSON.stringify({})
        },
        notExecuting: {
            status: 404
        }
    },
    dependencyModified: {
        modified: {
            status: 200,
            responseText: JSON.stringify({
                dataModifiedSinceTimestamp: true
            })
        },
        notModified: {
            status: 200,
            responseText: JSON.stringify({
                dataModifiedSinceTimestamp: false
            })
        }
    },
    getLastExecutionDate: {
        response: {
            status: 200,
            responseText: JSON.stringify({
                    summary: {
                        lastExecutionDate: 123456789
                    }
                }
            )
        }
    }
};