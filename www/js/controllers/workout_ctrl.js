angular.module('workoutCtrlModule', ['ionic', 'settingsServiceModule', 'workoutServiceModule', 'exercisesServiceModule', 'PRServiceModule'])

.controller('WorkoutCtrl', function($scope, workoutService, settingsService, $ionicListDelegate, $ionicSideMenuDelegate, $ionicFilterBar, exercisesService) {
  $scope.$on('$ionicView.enter', function() {
    $ionicSideMenuDelegate.canDragContent(true);
  });

  $scope.model = {
    addExercise: addExercise,
    removeExercise: removeExercise,
    increment: increment,
    decrement: decrement,
    save_workout: save_workout,
    showSearchBar: showSearchBar
  }

  console.log('Parent Workout controller initiated');

  function addExercise(workout, exercise) {
    //if not already added
    var index = _.findIndex(workout.exercises, {name: exercise.name})
    console.log('INDEX', index)
    if (index < 0) {
      console.log(JSON.stringify(exercise))
      exercise.sets = [];
      workout.exercises.push(exercise);
      if (searchBar) {
        console.log('Added exercise while search bar was open')
        searchBar();
      }
    }
    save_workout(workout);
    console.log("workout: ", JSON.stringify(workout));
    return index > 0 ? index : workout.exercises.length-1
  }

  function removeExercise(workout, index) {
    workout.exercises.splice(index, 1);
    save_workout(workout);
    console.log('remoive exercise called')
  }

  function increment(set) {
    if (!set.reps) set.reps = 0;
    console.log('increment called')
    set.reps++;
  }

  function decrement(set) {
    if (set.reps > 0) set.reps--;
  }

  function save_workout(workout) {
    workoutService.save_workout(workout);
  }

  function showSearchBar() {
    if ($scope.model.list[0].type === 'category') {
      $scope.model.list = $scope.model.exercises
    }
    searchBar = $ionicFilterBar.show({
      items: $scope.model.list,
      update: function (filteredItems, filterText) {
        $scope.model.list = filteredItems;
        if (filterText) {
          console.log(filterText);
        }
      },
      cancel: function() {
        $scope.model.list = $scope.model.xCategories
      }
    });
  }

  $scope.search = '';
  var searchBar;

  $scope.model.xCategories = exercisesService.categories;
  $scope.model.exercises = exercisesService.exercises;
  $scope.model.list = $scope.model.xCategories;
})

.controller('WorkoutOverviewCtrl', function($scope, $state, $ionicHistory, $ionicSideMenuDelegate, $ionicModal, workout, date, exercisesService, $cordovaToast) {

  $scope.$on('$ionicView.enter', function() {
    $ionicSideMenuDelegate.canDragContent(true);
  });

  $scope.workout = workout;
  $scope.date = date;
  $scope.model = $scope.model;
  var selected = [];

  console.log('Child Workout controller initiated');
  console.log('\n\nCHILD Workout', JSON.stringify($scope.model.workout));
  console.log('FROM CHILD DATE', date);
  console.log('FROM CHILD WORKOUT', JSON.stringify(workout));

  $ionicModal.fromTemplateUrl('templates/exercises_modal.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.model.exercises_modal = modal;
  });

  $scope.$on('modal.hidden', function() {
    console.log('Modal was hidden')
    setTimeout(function() {
      $scope.model.list = $scope.model.xCategories;
    }, 300)
  });

  $scope.show_exercises = function() {
    $scope.model.exercises_modal.show();
  }

  $scope.hide_exercises = function() {
    $scope.model.exercises_modal.hide();
  }

  $scope.addExercise = function(exercise) {
    $ionicHistory.nextViewOptions({
        disableAnimate: true
    });
    var index = $scope.model.addExercise($scope.workout, exercise);
    $state.go('app.workout.exercise', {date: $scope.date, exercise_index: index})
    $scope.model.exercises_modal.hide();
  }

  $scope.selected = function(item) {
    console.log('SELECTED', JSON.stringify(item))
    if (item.type === 'category') {
      $scope.model.list = exercisesService.getCategory(item.name)
    }
    else {
      console.log('add exercise')
      $scope.addExercise(item)
    }
  }

  $scope.action = function(workout) {
    if (!$scope.itemsSelected()) {
      $scope.model.save_workout(workout)
      $cordovaToast.show('Workout Saved', 'short', 'bottom');
    }
    else {
      $scope.deleteSelected()
    }
  }

  $scope.itemsSelected = function() {
    return selected.length > 0;
  }

  $scope.isSelected = function(index) {
    return selected.includes(index);
  }

  $scope.select = function(index) {
    if (!$scope.isSelected(index)) {
      selected.push(index);
    }
  }

  $scope.exerciseTapped = function(index) {
    if (selected.length === 0) {
      $state.go('app.workout.exercise', {date: $scope.date, exercise_index: index})
    }
    else if ($scope.isSelected(index)) {
      $scope.unselect(index);
    }
    else {
      $scope.select(index);
    }
  }

  $scope.deleteSelected = function() {
    $scope.workout.exercises = $scope.workout.exercises.filter(function(ex, index) { return !$scope.isSelected(index)});
    selected = [];
    $scope.model.save_workout($scope.workout)
  }

  $scope.unselect = function(index) {
    selected.splice(selected.indexOf(index), 1)
  }
})

.controller('ExerciseLogCtrl', function($rootScope, $scope, $state, $ionicPopup, $ionicListDelegate, settingsService, workout, exercise_index, prService, $ionicTabsDelegate) {

  $scope.exercise = workout.exercises[exercise_index];
  $scope.history = prService.get_history($scope.exercise.name);
  $scope.pbKeys = Object.keys($scope.history.pbs);

  console.log('PBKEYS', $scope.pbKeys)
  console.log('EXERCISE LOG CONTROL')
  console.log('Workout from exercise_log_ctrl', JSON.stringify(workout))
  console.log('exercise_index', exercise_index)
  console.log('Workout', JSON.stringify($scope.model.workout, null, 2))

  console.log('EXERCISE SETS LENGTH', $scope.exercise.sets.length)

  $scope.goBack = function() {
    if ($scope.exercise.sets.length === 0) {
      $scope.model.removeExercise(workout, exercise_index)
    }
    $state.go('app.workout.overview', {date: workout.date});
  }

  $scope.updateWeightInfo = function(popup) {
    popup.info = getWeightInfo(popup.weight, popup.unit);
  }

  function getWeightInfo(weight, unit) {
    var info = null
    if ($scope.exercise.equipment === 'Barbell') {
      var barbellWeight = (unit === 'kg') ? 20 : 45;
      if (weight > barbellWeight) {
        var sideWeight = (weight - barbellWeight)/2;
        var info = sideWeight + unit + ' each side + ' + barbellWeight + unit + ' barbell';
      }
    }
    return info;
  }

  $scope.show_popup = function(set) {
    $scope.popup = {
      unit: set.unit,
      weight: set.weight || 0,
      info: getWeightInfo(set.weight, set.unit),
      increment: function() {
        this.weight = this.weight + 2.5;
        $scope.updateWeightInfo(this);
      },
      decrement: function() {
        if (this.weight >= 0 && this.weight <= 2.5) {
          this.weight = 0;
        }
        else if (this.weight > 2.5) {
          this.weight = this.weight - 2.5;
        }
        $scope.updateWeightInfo(this);
      }
    }
    console.log("popup function");
    var weight_popup = $ionicPopup.show({
      templateUrl: 'templates/weight_popup.html',
      title: 'Weight',
      scope: $scope,
      buttons: [
        {
          text: 'Cancel'
        },
        {
          text: 'Save',
          type: 'button-positive',
          onTap: function(e) {
            return $scope.popup.weight;
          }
        }
      ]
    })

    weight_popup.then(function(res) {
      set.weight = res || set.weight || 0;
    })
  }

  var month_labels = ['January', 'Febuary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  $scope.getHumanDateString = function(date) {
    if (date === workout.date) {
      return 'Today';
    }
    date = date.split('-');
    return date[1] + ' ' + month_labels[date[0]-1] + ' ' + date[2]
  }

  $scope.addSet = function(exercise) {
    var next = {unit: settingsService.getDefaultMassUnit(), reps: 0, weight: 0}
    if (exercise.sets.length > 0) {
      var previous = exercise.sets[exercise.sets.length-1];
      next.reps = (previous.reps) ? previous.reps : 0;
      next.weight = (previous.weight) ? previous.weight : 0;
    }
    exercise.sets.push(next);
    if ($ionicTabsDelegate.selectedIndex() > 0) {
      $ionicTabsDelegate.select(0);
    }
  }

  $scope.removeSet = function(index, exercise) {
    console.log('remove set called', index, exercise)
    $ionicListDelegate.closeOptionButtons();
    exercise.sets.splice(index, 1)
  }

  $rootScope.$on('WorkoutSaved', function(event, date) {
    $scope.history = prService.get_history($scope.exercise.name);
  });

  $rootScope.$on('gotSyncUpdates', function(event) {
    $scope.history = prService.get_history($scope.exercise.name);
  })

})
