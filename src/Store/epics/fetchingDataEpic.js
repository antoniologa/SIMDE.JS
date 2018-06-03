import 'firebase/firestore'
import { ofType } from 'redux-observable'
import { of } from 'rxjs'
import {
    flatMap,
} from 'rxjs/operators'
import firebase from '../../ControlPanel/Components/FirebaseProvider/firebase'
import {
    USER_LOGIN,
    FETCHING_SINGLE_ROOMS,
    FETCHING_GROUP_ROOMS,
} from '../../ControlPanel/Constants'

const firestore = firebase.firestore()
firestore.settings({ timestampsInSnapshots: true })


const fetchingDataEpic = action$ =>
    action$.pipe(
        ofType(USER_LOGIN),
        flatMap(() => (
            of(
                {
                    type: FETCHING_SINGLE_ROOMS,
                },
                {
                    type: FETCHING_GROUP_ROOMS,
                },
            )
        ))
    )

export default fetchingDataEpic
