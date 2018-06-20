import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { debounce } from 'throttle-debounce'
import PropTypes from 'prop-types'
import ActionGrade from 'material-ui/svg-icons/action/grade'
import {
    Step,
    Stepper,
    StepLabel,
  } from 'material-ui/Stepper'
import TextField from 'material-ui/TextField'
import RaisedButton from 'material-ui/RaisedButton'
import {
    openSnackBar,
    openPopUp,
    getMembers,
    openSideBarRank,
    saveInstanceResult,
    resetInstanceResult,
    sendResultsToRank,
    saveCodeToHistory,
} from '../../Actions'
import { Code } from '../../../Simulator/core/Common/Code';
import ProblemInfo from '../ProblemView/problemInfo'
import SuperescalarIntegration from '../../../Simulator/integration/superescalar-integration'
//import SuperescalarConfigModalComponent from '../../../Simulator/interface/components/modal/SuperescalarConfigModalComponent'
//import BatchModalComponent from '../../../Simulator/interface/components/modal/BatchModalComponent'
//import { toggleSuperConfigModal, toggleBatchModal } from '../../../Simulator/interface/actions/modals'
import RankingView from '../RankingView';


const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        openSnackBar,
        openPopUp,
        getMembers,
        openSideBarRank,
        saveInstanceResult,
        resetInstanceResult,
        sendResultsToRank,
        saveCodeToHistory,
        //toggleSuperConfigModal,
        //toggleBatchModal,
    }, dispatch)
}

const mapStateToProps = (state) => {
    return {
        user: state.controlPanel.user,
        cycle: state.cycle,
        userList: state.controlPanel.userList,
        problems: state.controlPanel.problems,
        instances: state.controlPanel.instances,
        ranking: state.controlPanel.ranking,
        toggleSideBarRank: state.controlPanel.toggleSideBarRank,
        results: state.controlPanel.results,
        groups: state.controlPanel.groups,
    }
}

// Values -> example: [ 2, 5, 3, 6 ]
const rankingSum = (values, bonus) => bonus - values.reduce((a, b) => a + b, 0)
const average = (values) => values.reduce((a, b) => a + b, 0) / values.length

class RoomInfo extends React.Component {

    state = {
        stepIndex: 0,
        code: {},
        scores: {},
        superConfig: {
            integerSumQuantity: 2,
            integerSumLatency: 1,
            integerMultQuantity: 2,
            integerMultLatency: 2,
            floatingSumQuantity: 2,
            floatingSumLatency: 4,
            floatingMultQuantity: 2,
            floatingMultLatency: 6,
            memoryQuantity: 2,
            memoryLatency: 4,
            jumpQuantity: 1,
            jumpLatency: 2,
            issueGrade: 4
        }
    }
    
    handleNext = () => {
        const {stepIndex} = this.state
        this.setState({
            stepIndex: stepIndex + 1,
        })
    }
    
    handlePrev = () => {
        const {stepIndex} = this.state
        if (stepIndex > 0) {
            this.setState({stepIndex: stepIndex - 1})
        }
    }

    handleOnChangeCode = debounce (
        300,
        (event, value) => {
            this.setState({
                code: {
                    ...this.state.code,
                    [this.props.problemsId[this.state.stepIndex]]: value,
                }
            }) 
        }
    )

    handleClickResetInstances = () => {
        console.log('RESET: ',  this.props.results[this.props.roomId])
        if (this.state.scores.hasOwnProperty(this.props.problemsId[this.state.stepIndex]) || (this.props.results.hasOwnProperty(this.props.roomId) &&  this.props.results[this.props.roomId].hasOwnProperty(this.props.problemsId[this.state.stepIndex]))) {
            let temp = { ...this.state.scores }
            delete temp[this.props.problemsId[this.state.stepIndex]]
            this.setState({
                scores: temp,
            })
            this.props.resetInstanceResult(this.props.roomId, this.props.problemsId[this.state.stepIndex])
            this.props.openSnackBar('SUCCESS: Instance results clear', 'success')
        }
        else
            this.props.openSnackBar('WARNING: Instances already clear', 'warning')

    }

    handleClickSendResults = () => {
        if (this.state.scores.hasOwnProperty(this.props.problemsId[this.state.stepIndex])) {
            if (this.state.scores[this.props.problemsId[this.state.stepIndex]].areAllCorrect) {
                if (this.props.roomType === 'single') {
                    let results = {
                        room: this.props.roomId,
                        member: this.props.user.uid,
                        problem: this.props.problemsId[this.state.stepIndex],
                        cycles: this.state.scores[this.props.problemsId[this.state.stepIndex]].cycles
                    }
                    this.props.sendResultsToRank(results)
                } else if (this.props.roomType === 'group') {
                    let member = ''
                    console.log('MEMBERS: ', this.props.members)
                    let isLeader = this.props.members.some(memberId => {
                        if (this.props.groups[memberId].leader === this.props.user.uid) 
                            member = memberId
                        return this.props.groups[memberId].leader === this.props.user.uid
                    })
                    if (isLeader) {
                        let results = {
                            room: this.props.roomId,
                            member,
                            problem: this.props.problemsId[this.state.stepIndex],
                            cycles: this.state.scores[this.props.problemsId[this.state.stepIndex]].cycles
                        }
                        this.props.sendResultsToRank(results)
                    }
                    else
                        this.props.openSnackBar('WARNING: Only leaders can send results', 'warning')
                }
            }
            else {
                this.props.openSnackBar('WARNING: All instance must be correct before send results', 'warning')
            }
        }
        else {
            this.props.openSnackBar('WARNING: You dont have results to send', 'warning')
        }
    }

    calculateRankingScore = () => {
        const { roomId, ranking } = this.props
        let membersResult = {}
        let scores = {}
        if (ranking[roomId]) {
            Object.keys(ranking[roomId]).map((member) => (
                membersResult[member] = Object.keys(ranking[roomId][member]).map((problem) => (
                    ranking[roomId][member][problem]
                ))
            ))
            let maxNumCycle = Math.max(...Object.keys(membersResult).map((member) => (
                Math.max(...membersResult[member])
            )))
            Object.keys(membersResult).map((member) => (
                scores[member] = rankingSum(membersResult[member], maxNumCycle * membersResult[member].length)
            ))
        }
        return scores
    }

    isValidCode = () => {
        try {
            let code = new Code();
            code.load(this.state.code[this.props.problemsId[this.state.stepIndex]]);
            return true
        } catch (error) {
            this.props.openSnackBar(`ERROR(Code): ${error}`, 'error')
        }
    }

    handleTestCodeWithAllInstances = () => {
        const { problems, problemsId, instances } = this.props
        const { stepIndex } = this.state
        let result = []
        let correct = []
        SuperescalarIntegration.saveSuperConfig(this.state.superConfig);
        Object.keys(problems[problemsId[stepIndex]].instances).forEach((instanceId) => {
            let test = this.handleTestCodeWithSelectedInstance(instanceId, instances[instanceId].initial, instances[instanceId].final, this.state.code[problemsId[stepIndex]])
            result.push(test.cycles)
            correct.push(test.isCorrect)
        })
        this.setState({
            scores: {
                ...this.state.scores,
                [problemsId[stepIndex]]: {
                    cycles: parseFloat(parseFloat(average(result)).toFixed(2)), //Esto es lo que finalmente se envia la media de los test con todas las instancias
                    areAllCorrect: correct.every(item => item)
                }
            }
        })
    }

    handleIndividualTest = (instance) => {
        SuperescalarIntegration.saveSuperConfig(this.state.superConfig);
        this.handleTestCodeWithSelectedInstance(instance, this.props.instances[instance].initial, this.props.instances[instance].final, this.state.code[this.props.problemsId[this.state.stepIndex]])
        //console.log('CODE: ', this.state.code, 'ID: ', this.props.problemsId[this.state.stepIndex])

        //console.log('Instancia ID: ', instance)
        //console.log('Instancia test: ', this.props.instances[instance].initial)
        //console.log('memorysSSSS', SuperescalarIntegration.contentIntegration.MEMContent);
        //console.log('memorysSSSS----', SuperescalarIntegration.contentIntegration.MEMContent);
        
        //console.log('Cycles: ', SuperescalarIntegration.superescalar.status.cycle)
        //console.log('Datas***: ', SuperescalarIntegration.superescalar.memory.data)

    }

    handleTestCodeWithSelectedInstance = (instance, instanceInputInitial, instanceInputFinal, codeInput) => {
        /* Testea el codigo con la instancia seleccionada*/
        //console.log('instanceInputInitial: ', instanceInputInitial)
        //console.log('codeInput***: ', codeInput)
        let results = {}
        
        SuperescalarIntegration.loadInstance(instanceInputInitial)
        SuperescalarIntegration.loadCodeFromPanel(codeInput)
        
        SuperescalarIntegration.setBatchMode(1, 9, 30);
        SuperescalarIntegration.makeBatchExecution()
        let isCorrectResult = SuperescalarIntegration.checkResult(instanceInputFinal)
        //Action to store in redux
        results = {
            room: this.props.roomId,
            problem: this.props.problemsId[this.state.stepIndex],
            instance: instance,
            isCorrect: isCorrectResult,
            cycles: SuperescalarIntegration.superescalar.status.cycle,
        }
        this.props.saveInstanceResult(results)
        return {
            cycles: SuperescalarIntegration.superescalar.status.cycle,
            isCorrect: isCorrectResult,
        }
        //console.log('results***: ', results)
        
        /*console.log('isCorrectResult: ', isCorrectResult)
        console.log('Cycles: ', SuperescalarIntegration.superescalar.status.cycle)
        console.log('Datas***: ', SuperescalarIntegration.superescalar.memory.data)*/
    }

    handleSaveCode = () => {
        let saveCode = {
            user: this.props.user.uid,
            room: this.props.roomId,
            roomName: this.props.roomName,
            problemId: this.props.problemsId[this.state.stepIndex],
            problem: this.props.problems[this.props.problemsId[this.state.stepIndex]].name,
            code: this.state.code[this.props.problemsId[this.state.stepIndex]],
        }
        this.props.saveCodeToHistory(saveCode)
        //this.props.toggleBatchModal(true)
        //this.props.toggleSuperConfigModal(true)
        //Lanzar accion para salvar el codigo con la siguiente info: SALA - PROBLEMA(NAME) - CODE 
    }

    instanceResult = (instance) => {
        if (this.props.results.hasOwnProperty(this.props.roomId))
            if (this.props.results[this.props.roomId].hasOwnProperty(this.props.problemsId[this.state.stepIndex]))
                if (this.props.results[this.props.roomId][this.props.problemsId[this.state.stepIndex]].hasOwnProperty(instance)) {
                    const instanceResult = this.props.results[this.props.roomId][this.props.problemsId[this.state.stepIndex]][instance]
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: instanceResult.isCorrect ? '#71bd78' : '#fe8484'}} >
                            <p>{this.props.instances[instance].name}</p>
                            <p>Cycles: {instanceResult.cycles}</p>
                            {
                                instanceResult.isCorrect
                                ? <p>Correct</p>
                                : <p>Incorrect</p>
                            }
                        </div>  
                    )
                }
    }

    getStepContent = (stepIndex) => (
        <div>
            <ProblemInfo 
                problemId={this.props.problemsId[stepIndex]}
            />
            
            <h2>Test your code with the instances</h2>
            <div  style={{ display: 'flex', flexDirection: 'column' }}>
                <TextField
                    key={`code${this.props.problemsId[stepIndex]}`}
                    rows={10}
                    defaultValue={this.state.code.hasOwnProperty(this.props.problemsId[stepIndex]) ? this.state.code[this.props.problemsId[stepIndex]] : '' }
                    underlineShow={false}
                    style={{ paddingLeft: '10px', marginTop: 0, width: '500px', borderStyle: 'solid', borderWidth: '1px' }}
                    floatingLabelText="Write your code here!"
                    onChange={this.handleOnChangeCode}
                    multiLine
                />
                <div>
                    <RaisedButton
                        primary
                        style={{ margin: '10px' }}
                        label="Save Code"
                        onClick={() => this.isValidCode() && this.handleSaveCode()}
                    />
                    {/*
                    <RaisedButton
                        primary
                        style={{ margin: '10px' }}
                        label="Superescalar Config"
                        onClick={() ()}
                    />
                    <RaisedButton
                        primary
                        style={{ margin: '10px' }}
                        label="Superescalar Config"
                        onClick={() => ()}
                    />
                    */}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {
                        Object.keys(this.props.problems[this.props.problemsId[stepIndex]].instances).map((instance) => (
                            <div key={instance}>
                                <RaisedButton
                                    secondary
                                    style={{ margin: '10px' }}
                                    label={`Test ${this.props.instances[instance].name}`}
                                    onClick={() => this.isValidCode() && this.handleIndividualTest(instance)}
                                />
                                {
                                    this.instanceResult(instance)
                                }
                            </div>
                        ))
                    }
                    {
                        <div>
                            <RaisedButton
                                secondary
                                style={{ margin: '10px' }}
                                label="Test all instances"
                                onClick={() => this.isValidCode() && this.handleTestCodeWithAllInstances()}
                            />
                            {
                                this.state.scores.hasOwnProperty(this.props.problemsId[stepIndex])
                                ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: this.state.scores[this.props.problemsId[stepIndex]].areAllCorrect ? '#71bd78' : '#fe8484'}} >
                                    <p>Tested code with all instances</p>
                                    <p>Average cycles: {this.state.scores[this.props.problemsId[stepIndex]].cycles}</p>
                                    {
                                        this.state.scores[this.props.problemsId[stepIndex]].areAllCorrect
                                        ? <p>Correct</p>
                                        : <p>Incorrect</p>
                                    }
                                </div>
                                : null
                            }
                        </div>
                    }
                </div>
            </div>
        </div>
    )
    
    render() {
        const {
            problemsId,
            problems,
            roomName,
            roomType,
        } = this.props
        const { stepIndex} = this.state
        const contentStyle = {
            transition: 'margin-right 450ms cubic-bezier(0.23, 1, 0.32, 1)',
            marginRight: '0px',
            padding: '5%',
            margin: 'auto'
        }
        if (this.props.toggleSideBarRank)
            contentStyle.marginRight = '250px'
        else
            contentStyle.marginRight = '0px'
        return (
            <div>
                <RankingView 
                    type={roomType}
                    scores={this.calculateRankingScore()}
                />
                <h1>{roomName}</h1>
                <RaisedButton
                    style={{ position: 'fixed', top: '75px', right: '6px' }}
                    primary
                    label="Ranking"
                    labelPosition="before"
                    icon={<ActionGrade />}
                    onClick={this.props.openSideBarRank}
                />
                {
                    this.props.problemsId.length < 1
                    ? <h3>This room has no problems</h3>
                    : <div style={contentStyle}>
                        <Stepper activeStep={stepIndex}>
                            {
                                problemsId.map((problem) => (
                                    <Step key={problem}>
                                        <StepLabel>{problems[problem].name}</StepLabel>
                                    </Step>
                                ))
                            }
                        </Stepper>
                        <div style={{marginTop: 12}}>
                            <RaisedButton
                                label="Back"
                                disabled={stepIndex === 0}
                                onClick={this.handlePrev}
                                style={{marginRight: 12}}
                            />
                            <RaisedButton
                                label="Next"
                                disabled={stepIndex === problemsId.length - 1}
                                primary
                                onClick={this.handleNext}
                                style={{marginRight: 12}}
                            />
                            <RaisedButton
                                label="Reset"
                                primary
                                onClick={this.handleClickResetInstances}
                                style={{marginRight: 12}}
                            />
                            <RaisedButton
                                label="Send Result"
                                primary
                                onClick={this.handleClickSendResults}
                            />
                        </div>
                        {this.getStepContent(stepIndex)}
                    </div>
                }
            </div>
        )
    }
}

RoomInfo.propTypes = {
    roomName: PropTypes.string.isRequired,
    roomType: PropTypes.string.isRequired,
    roomId: PropTypes.string.isRequired,
    problemsId: PropTypes.array.isRequired,
    members: PropTypes.array.isRequired,
    instances: PropTypes.objectOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
        }).isRequired,
    ).isRequired,
    openSnackBar: PropTypes.func.isRequired,
    sendResultsToRank: PropTypes.func.isRequired,
    openSideBarRank: PropTypes.func.isRequired,
}

export default connect(mapStateToProps, mapDispatchToProps)(RoomInfo)