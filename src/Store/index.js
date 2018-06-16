import { applyMiddleware, createStore, compose } from 'redux'
import { createEpicMiddleware, combineEpics } from 'redux-observable'
import { enableBatching } from '../Simulator/interface/reducers/batching';
import { SuperescalarReducers } from '../Simulator/interface/reducers';
import { generateRangeArray } from '../Simulator/interface/utils/interval';
import { MACHINE_REGISTER_SIZE, MEMORY_SIZE } from '../Simulator/core/Constants';
import { saveState, loadState } from '../LocalStorage'
import { 
    userLogin,
    groupsMiddleware,
    instancesMiddleware,
    roomMiddleware,
    problemsMiddleware,
} from './middleware'
import {
    fetchingDataEpic,
    groupsEpic,
    instancesEpic,
    roomEpic,
    problemsEpic,
} from './epics'


export const initialState = {
    prefetchUnit: [],
    decoder: [],
    jumpPrediction: [],
    history: [],
    functionalUnitIntAdd: {},
    functionalUnitIntSub: {},
    functionalUnitFloAdd: {},
    functionalUnitFloSub: {},
    functionalUnitMemory: {},
    functionalUnitJump: {},
    functionalUnitAluMem: {},
    reserveStationIntAdd: [],
    reserveStationIntSub: [],
    reserveStationFloAdd: [],
    reserveStationFloSub: [],
    reserveStationMemory: [],
    reserveStationJump: [],
    ROBGpr: {
        data: [],
        visibleRangeValues: generateRangeArray(MACHINE_REGISTER_SIZE)
    },
    ROBFpr: {
        data: [],
        visibleRangeValues: generateRangeArray(MACHINE_REGISTER_SIZE)
    },
    reorderBuffer: [],
    generalRegisters: {
        data: [],
        visibleRangeValues: generateRangeArray(MACHINE_REGISTER_SIZE)
    },
    floatingRegisters: {
        data: [],
        visibleRangeValues: generateRangeArray(MACHINE_REGISTER_SIZE)
    },
    memory: {
        data: [],
        visibleRangeValues: generateRangeArray(MEMORY_SIZE)
    },
    cycle: 0,
    code: [],
    colorBasicBlocks: false,
    isLoadModalOpen: false,
    isAuthorModalOpen: false,
    isOptionsModalOpen: false,
    isSuperConfigModalOpen: false,
    isLoadContentModalOpen: false,
    isBatchModalOpen: false,
    isBatchResultsModalOpen: false,
    batchResults: {},
    controlPanel: {
        user: null,
        userList: {},
        actualPath: '',
        activeGroup: '',
        toggleSideBar: false,
        isLoading: true,
        shouldRedirect: false,
        popUpData: {
            title: '',
            type: '',
            open: false,
        },
        snackBarData: {
            message: '',
            type: '',
            open: false,
        },
        singleRooms: {},
        groupRooms: {},
        userGroupRooms: [],
        roomsOrdered: [],
        groups: {},
        groupsOrdered: [],
        instances: {},
        instancesOrdered: [],
        problems: {},
        problemsOrdered: [],
    },
};

const loadFromLocalStorage = () => (
    loadState()
        ? { ...initialState, controlPanel: loadState() }
        : initialState
)

const composeEnhancers =
    typeof window === 'object' &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?   
        window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
        // Specify extension’s options like name, actionsBlacklist, actionsCreators, serialize...
        }) : compose

const rootEpic = combineEpics(
    fetchingDataEpic,
    groupsEpic,
    instancesEpic,
    roomEpic,
    problemsEpic,
)

const epicMiddleware = createEpicMiddleware(rootEpic)

const middleWares = [
    epicMiddleware,
    userLogin,
    groupsMiddleware,
    instancesMiddleware,
    roomMiddleware,
    problemsMiddleware,
]

const enhancer = composeEnhancers(applyMiddleware(...middleWares))

export const store = createStore(
    enableBatching(SuperescalarReducers),
    loadFromLocalStorage(),
    enhancer
);

store.subscribe(() => {
    saveState(store.getState().controlPanel)
})
